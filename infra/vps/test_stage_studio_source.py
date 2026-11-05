import importlib.util
import io
import tarfile
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid

spec = importlib.util.spec_from_file_location('stage_studio_source', Path(__file__).with_name('stage-studio-source.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class StageStudioSourceTest(unittest.TestCase):
    def fixture(self, root):
        repo = root / 'repo'
        source = repo / 'packages/core/src/demos'
        scripts = repo / 'packages/core/scripts'
        source.mkdir(parents=True)
        scripts.mkdir(parents=True)
        (source / 'studio.ts').write_text('export const STUDIO_VERSION = "design-studio-1";\n')
        (scripts / 'studio-preview.ts').write_text('console.log("isolated-test");\n')
        (repo / '.env.worker').write_text('PRIVATE_TOKEN=fixture-never-copy\n')
        (repo / '.env.worker').chmod(0o600)
        subprocess.run(['git','init','-q',str(repo)], check=True)
        subprocess.run(['git','-C',str(repo),'add','packages'], check=True)
        subprocess.run(['git','-C',str(repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'],check=True)
        commit = subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'], text=True).strip()
        snapshot = root / 'snapshot'
        snapshot.mkdir(mode=0o700)
        return repo, commit, snapshot

    def test_strict_umask_keeps_checkout_and_secrets_private_but_stages_readable_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, commit, snapshot = self.fixture(Path(tmp))
            original = repo / 'packages/core/src/demos/studio.ts'
            committed = original.read_text()
            original.write_text('// local changes must never enter the snapshot\n')
            original.chmod(0o600)
            old = os.umask(0o077)
            try:
                module.stage_source(repo, commit, snapshot)
            finally:
                os.umask(old)
            self.assertEqual(original.stat().st_mode & 0o777, 0o600)
            self.assertEqual((repo/'.env.worker').stat().st_mode & 0o777, 0o600)
            self.assertFalse((snapshot/'.env.worker').exists())
            self.assertEqual(snapshot.stat().st_mode & 0o777, 0o700)
            self.assertEqual((snapshot/'packages/core/src').stat().st_mode & 0o777, 0o755)
            self.assertEqual((snapshot/'packages/core/src/demos/studio.ts').stat().st_mode & 0o777, 0o644)
            self.assertEqual((snapshot/'packages/core/src/demos/studio.ts').read_text(), committed)
            self.assertIn('local changes', original.read_text())

    def test_archive_rejects_links_instead_of_following_checkout_secrets(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, _, snapshot = self.fixture(Path(tmp))
            (repo/'packages/core/src/private-link').symlink_to('../../../.env.worker')
            subprocess.run(['git','-C',str(repo),'add','packages/core/src/private-link'],check=True)
            subprocess.run(['git','-C',str(repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','link'],check=True)
            commit = subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
            with self.assertRaisesRegex(ValueError,'Links'):
                module.stage_source(repo, commit, snapshot)

    def test_existing_snapshot_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo, commit, snapshot = self.fixture(Path(tmp))
            (snapshot/'existing').write_text('keep')
            with self.assertRaisesRegex(ValueError,'leere'):
                module.stage_source(repo, commit, snapshot)
            self.assertEqual((snapshot/'existing').read_text(),'keep')

    @unittest.skipUnless(os.environ.get('STUDIO_PERMISSION_TEST_CONTAINER'), 'explicit disposable test-container context required')
    def test_real_uid_1000_cannot_read_root_600_but_can_read_the_staged_snapshot(self):
        # Only a unique /dev/shm folder is touched; no database files, SQL or container lifecycle changes.
        container = os.environ['STUDIO_PERMISSION_TEST_CONTAINER']
        prefix = ['docker','--host=unix:///var/run/docker.sock']
        env = dict(os.environ)
        for key in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']:
            env.pop(key,None)
        def docker(*args, check=True, input_data=None):
            result=subprocess.run([*prefix,*args],env=env,input=input_data,text=not isinstance(input_data,bytes),capture_output=True)
            if check:self.assertEqual(result.returncode,0,result.stderr)
            return result
        remote = '/dev/shm/seitenwerk-permission-test-'+uuid.uuid4().hex
        with tempfile.TemporaryDirectory() as tmp:
            repo, commit, snapshot = self.fixture(Path(tmp))
            module.stage_source(repo, commit, snapshot)
            try:
                docker('exec','--user','0:0',container,'mkdir','-p',remote+'/raw',remote+'/staged')
                docker('exec','--user','0:0',container,'chmod','755',remote,remote+'/raw',remote+'/staged')
                docker('exec','-i','--user','0:0',container,'/bin/sh','-c','umask 077; cat > "$1"','sh',remote+'/raw/studio.ts',input_data=(repo/'packages/core/src/demos/studio.ts').read_text())
                docker('exec','--user','0:0',container,'chmod','600',remote+'/raw/studio.ts')
                failed=docker('exec','--user','1000:1000',container,'cat',remote+'/raw/studio.ts',check=False)
                self.assertNotEqual(failed.returncode,0)
                self.assertIn('Permission denied',failed.stderr)
                payload=io.BytesIO()
                with tarfile.open(fileobj=payload,mode='w') as archive:
                    archive.add(snapshot/'packages/core/src',arcname='.')
                docker('exec','-i','--user','0:0',container,'tar','-x','-C',remote+'/staged',input_data=payload.getvalue())
                success=docker('exec','--user','1000:1000',container,'cat',remote+'/staged/demos/studio.ts')
                self.assertIn('design-studio-1',success.stdout)
            finally:
                docker('exec','--user','0:0',container,'rm','-rf','--',remote,check=False)

if __name__=='__main__':unittest.main()
