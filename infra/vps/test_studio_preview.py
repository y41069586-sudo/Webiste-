import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).parent
RELEASE = 'd' * 40
FAKE = r'''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
name=Path(sys.argv[0]).name;a=sys.argv[1:]
with open(os.environ['CALLS'],'a') as f:f.write(json.dumps([name,*a])+'\n')
if name=='git':
 if a==['rev-parse','--show-toplevel']:print(os.environ['DIR'])
 if a and a[0]=='diff' and os.environ.get('DIRTY')=='1':sys.exit(1)
elif name=='install':Path(a[-1]).mkdir(parents=True,exist_ok=True)
elif a[:2]==['ps','-aq']:print('existing-worker')
elif a and a[0]=='inspect':
 fmt=a[2]
 if '.State.Running' in fmt:print('false')
 elif '.Config.Env' in fmt:print('DRY_RUN=false')
 elif '.Config.Labels' in fmt:print(os.environ['DIR']+'/docker-compose.worker.yml,'+os.environ['DIR']+'/docker-compose.worker.live.yml')
else:
 if 'create' in a and '--no-deps' in a:sys.exit(2)
 if 'config' in a:print(json.dumps({'services':{'worker':{'environment':{'DRY_RUN':'false'}}}}))
 if '/repo/packages/core/scripts/studio-preview.ts' in a:
  p=Path(os.environ['STUDIO_PREVIEW_DIR'])
  (p/'started.json').write_text('{}')
  (p/'result.json').write_text(json.dumps({'stage':'blocked' if os.environ.get('PREVIEW_FAIL') else 'awaiting_manual_visual_review'}))
  if not os.environ.get('PREVIEW_FAIL'):(p/'index.html').write_text('<h1>Test</h1>')
  if os.environ.get('PREVIEW_FAIL'):sys.exit(1)
'''

class StudioPreviewTest(unittest.TestCase):
    def run_preview(self, already_started=False, **extra):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=root/'repo';repo.mkdir()
            scripts=repo/'infra/vps';scripts.mkdir(parents=True)
            shutil.copyfile(ROOT/'update-worker.sh',scripts/'update-worker.sh')
            (repo/'.env.worker').write_text('PRIVATE_TOKEN=do-not-print\n')
            for n in ['docker-compose.worker.yml','docker-compose.worker.live.yml']:
                (repo/n).write_text('services: {}\n')
            output=root/'preview'
            if already_started:
                output.mkdir();(output/'started.json').write_text('{}')
            bins=root/'bin';bins.mkdir()
            for n in ['git','docker','install']:
                p=bins/n;p.write_text(FAKE);p.chmod(0o700)
            env={**os.environ,'PATH':str(bins)+':'+os.environ['PATH'],'DIR':str(repo),'RELEASE':RELEASE,'CALLS':str(root/'calls'),'STUDIO_PREVIEW_DIR':str(output),**extra}
            result=subprocess.run(['bash',str(ROOT/'studio-preview.sh')],env=env,text=True,capture_output=True)
            calls=[json.loads(s) for s in (root/'calls').read_text().splitlines()]
            self.assertEqual((repo/'.env.worker').read_text(),'PRIVATE_TOKEN=do-not-print\n')
            self.assertNotIn('do-not-print',result.stdout+result.stderr)
            archive=Path(str(output)+'.tar.gz')
            return result,calls,archive.exists(),archive.stat().st_mode & 0o777 if archive.exists() else None

    def test_pauses_first_retains_compose_and_runs_one_isolated_preview(self):
        result,calls,archived,mode=self.run_preview()
        self.assertEqual(result.returncode,0,result.stderr)
        stop=next(i for i,c in enumerate(calls) if 'stop' in c)
        build=next(i for i,c in enumerate(calls) if 'build' in c)
        self.assertLess(stop,build)
        previews=[c for c in calls if any('studio-preview.ts' in s for s in c)]
        self.assertEqual(len(previews),1)
        self.assertIn('DRY_RUN=true',previews[0])
        self.assertIn('PAYMENT_PROVIDER=mock',previews[0])
        self.assertTrue(any('worker.live.yml' in s for s in previews[0]))
        self.assertFalse(any('up' in c for c in calls))
        self.assertTrue(archived)
        self.assertEqual(mode,0o600)

    def test_started_marker_blocks_another_paid_attempt(self):
        result,calls,_,_=self.run_preview(already_started=True)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any('docker'==c[0] for c in calls))

    def test_failed_preview_keeps_worker_paused_and_preserves_diagnostics(self):
        result,calls,archived,_=self.run_preview(PREVIEW_FAIL='1')
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any('up' in c for c in calls))
        self.assertEqual(sum(any('studio-preview.ts' in s for s in c) for c in calls),1)
        self.assertTrue(archived)

    def test_dirty_code_is_untouched(self):
        result,calls,_,_=self.run_preview(DIRTY='1')
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any(c[0]=='docker' for c in calls))

    def test_reuses_built_image_without_another_build_or_git_mutation(self):
        result,calls,_,_=self.run_preview(STUDIO_PREVIEW_USE_BUILT_IMAGE='true')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertFalse(any('build' in c or 'create' in c or 'up' in c for c in calls))
        self.assertFalse(any(c[0]=='git' and any(x in c for x in ['fetch','merge']) for c in calls))
        self.assertEqual(sum(any('/repo/packages/core/scripts/studio-preview.ts'==s for s in c) for c in calls),1)

    def test_shares_only_after_success_and_never_restarts_daemon(self):
        for failed in ['', '1']:
            result,calls,_,_=self.run_preview(STUDIO_PREVIEW_USE_BUILT_IMAGE='true',STUDIO_PREVIEW_SHARE='true',PREVIEW_FAIL=failed)
            shares=[c for c in calls if '/repo/packages/core/scripts/share-studio-preview.ts' in c]
            self.assertEqual(len(shares),0 if failed else 1)
            self.assertFalse(any('up' in c or 'build' in c for c in calls))

if __name__=='__main__':unittest.main()
