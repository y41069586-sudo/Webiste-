import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).parent
RELEASE = 'd' * 40
# Shell orchestration only. The real snapshot helper has separate Git/POSIX and unprivileged-container tests.
STAGER = r'''import argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--repo');p.add_argument('--release');p.add_argument('--output');a=p.parse_args()
for part in ['src','scripts']:
 d=Path(a.output)/'packages/core'/part;d.mkdir(parents=True,exist_ok=True);d.chmod(0o755)
 (d/'fixture.ts').write_text('// committed test source')
 (d/'fixture.ts').chmod(0o644)
'''
FAKE = r'''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
name=Path(sys.argv[0]).name;a=sys.argv[1:]
with open(os.environ['CALLS'],'a') as f:f.write(json.dumps([name,*a])+'\n')
if name=='git':
 if a==['rev-parse','--show-toplevel']:print(os.environ['DIR'])
 if a and a[0]=='diff' and os.environ.get('DIRTY')=='1':sys.exit(1)
 if a and a[0]=='diff' and '--' in a and os.environ.get('DEPENDENCIES_CHANGED')=='1':sys.exit(1)
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
 if '/repo/packages/core/scripts/recover-studio-preview.ts' in a:
  if os.environ.get('RECOVERY_FAIL'):sys.exit(1)
  p=Path(os.environ['STUDIO_PREVIEW_DIR']);(p/'index.html').write_text('<h1>Elektro Kontur: nicht freigegeben</h1>')
  (p/'recovery.json').write_text('{"newAiCalls":0,"manualApproved":false}')
 if '/repo/packages/core/scripts/studio-preview.ts' in a:
  if '--preflight' in a:sys.exit(1 if os.environ.get('PREFLIGHT_FAIL') else 0)
  p=Path(os.environ['STUDIO_PREVIEW_DIR']);(p/'started.json').write_text('{"fictional":true}')
  failed=os.environ.get('PREVIEW_FAIL')
  (p/'result.json').write_text(json.dumps({'stage':'blocked' if failed else 'awaiting_manual_visual_review'}))
  if not failed or failed=='qa':(p/'index.html').write_text('<h1>Elektro Kontur</h1>')
  if failed:sys.exit(1)
'''

class StudioPreviewTest(unittest.TestCase):
    def run_preview(self, already_started=False, rendered=False, saved=False, **extra):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=root/'repo';repo.mkdir()
            scripts=repo/'infra/vps';scripts.mkdir(parents=True)
            shutil.copyfile(ROOT/'update-worker.sh',scripts/'update-worker.sh')
            (scripts/'stage-studio-source.py').write_text(STAGER)
            (repo/'.env.worker').write_text('PRIVATE_TOKEN=do-not-print\n')
            (repo/'.env.worker').chmod(0o600)
            for n in ['docker-compose.worker.yml','docker-compose.worker.live.yml']:(repo/n).write_text('services: {}\n')
            output=root/'preview'
            if already_started or rendered or saved:
                output.mkdir();(output/'started.json').write_text('{"fictional":true}')
            if rendered:(output/'index.html').write_text('<h1>Elektro Kontur</h1>')
            if saved:(output/'attempt-2.json').write_text('{"content":{}}')
            bins=root/'bin';bins.mkdir()
            for n in ['git','docker','install']:
                p=bins/n;p.write_text(FAKE);p.chmod(0o700)
            env={**os.environ,'PATH':str(bins)+':'+os.environ['PATH'],'DIR':str(repo),'RELEASE':RELEASE,'CALLS':str(root/'calls'),'STUDIO_PREVIEW_DIR':str(output),**extra}
            result=subprocess.run(['bash',str(ROOT/'studio-preview.sh')],env=env,text=True,capture_output=True)
            calls=[json.loads(s) for s in (root/'calls').read_text().splitlines()]
            self.assertEqual((repo/'.env.worker').read_text(),'PRIVATE_TOKEN=do-not-print\n')
            self.assertEqual((repo/'.env.worker').stat().st_mode & 0o777,0o600)
            self.assertNotIn('do-not-print',result.stdout+result.stderr)
            archive=Path(str(output)+'.tar.gz')
            return result,calls,archive.exists(),archive.stat().st_mode & 0o777 if archive.exists() else None

    @staticmethod
    def generations(calls):return [c for c in calls if '/repo/packages/core/scripts/studio-preview.ts' in c and '--preflight' not in c]
    @staticmethod
    def shares(calls):return [c for c in calls if '/repo/packages/core/scripts/share-studio-preview.ts' in c]

    def test_pauses_first_retains_compose_and_runs_one_isolated_preview(self):
        result,calls,archived,mode=self.run_preview()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertLess(next(i for i,c in enumerate(calls) if 'stop' in c),next(i for i,c in enumerate(calls) if 'build' in c))
        self.assertEqual(len(self.generations(calls)),1)
        preview=self.generations(calls)[0]
        self.assertIn('DRY_RUN=true',preview);self.assertIn('PAYMENT_PROVIDER=mock',preview)
        self.assertTrue(any('worker.live.yml' in s for s in preview))
        self.assertFalse(any('up' in c for c in calls))
        self.assertTrue(archived);self.assertEqual(mode,0o600)

    def test_started_without_html_blocks_another_paid_attempt(self):
        result,calls,_,_=self.run_preview(already_started=True)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any(c[0]=='docker' for c in calls))

    def test_existing_html_is_shared_without_preflight_or_model_calls(self):
        result,calls,_,_=self.run_preview(rendered=True,STUDIO_PREVIEW_USE_BUILT_IMAGE='true',STUDIO_PREVIEW_SHARE='true',PREFLIGHT_FAIL='1')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.generations(calls),[]);self.assertEqual(len(self.shares(calls)),1)
        self.assertFalse(any('--preflight' in c for c in calls))

    def test_existing_preview_id_is_passed_to_share_without_generation(self):
        deploy='a'*24
        result,calls,_,_=self.run_preview(rendered=True,STUDIO_PREVIEW_USE_CHECKOUT='true',STUDIO_PREVIEW_SHARE='true',STUDIO_PREVIEW_DEPLOY_ID=deploy)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('STUDIO_PREVIEW_DEPLOY_ID='+deploy,self.shares(calls)[0])
        self.assertEqual(self.generations(calls),[])

    def test_viewing_existing_html_never_builds_even_without_a_resume_flag(self):
        result,calls,_,_=self.run_preview(rendered=True,STUDIO_PREVIEW_SHARE='true')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertFalse(any('build' in c or 'create' in c or 'up' in c for c in calls))
        self.assertEqual(self.generations(calls),[]);self.assertEqual(len(self.shares(calls)),1)

    def test_preflight_failure_never_starts_generation(self):
        result,calls,archived,_=self.run_preview(STUDIO_PREVIEW_USE_BUILT_IMAGE='true',PREFLIGHT_FAIL='1')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.generations(calls),[]);self.assertEqual(self.shares(calls),[])
        self.assertIn('Vorprüfung fehlgeschlagen',result.stderr);self.assertFalse(archived)

    def test_failure_keeps_worker_paused_and_preserves_diagnostics(self):
        result,calls,archived,_=self.run_preview(PREVIEW_FAIL='author')
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any('up' in c for c in calls));self.assertEqual(len(self.generations(calls)),1)
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
        self.assertEqual(len(self.generations(calls)),1)

    def test_shares_html_even_after_a_later_qa_error_but_never_after_author_failure(self):
        for failure,count in [('',1),('qa',1),('author',0)]:
            result,calls,_,_=self.run_preview(STUDIO_PREVIEW_USE_BUILT_IMAGE='true',STUDIO_PREVIEW_SHARE='true',PREVIEW_FAIL=failure)
            self.assertEqual(len(self.shares(calls)),count)
            self.assertEqual(result.returncode,1 if failure else 0)
            self.assertFalse(any('up' in c or 'build' in c for c in calls))

    def test_source_only_preview_binds_readable_snapshot_not_the_private_checkout(self):
        result,calls,_,_=self.run_preview(STUDIO_PREVIEW_USE_CHECKOUT='true')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertFalse(any('build' in c or 'up' in c or 'create' in c for c in calls))
        preview=self.generations(calls)[0]
        mounts=[s for s in preview if s.endswith(':/repo/packages/core/src:ro') or s.endswith(':/repo/packages/core/scripts:ro')]
        self.assertEqual(len(mounts),2)
        self.assertTrue(all(s.startswith('/tmp/seitenwerk-studio-source.') for s in mounts))
        self.assertTrue(all(not Path(s.split(':')[0]).exists() for s in mounts)) # Temporary source removed after run.

    def test_source_only_preview_stops_when_dependencies_changed(self):
        result,calls,_,_=self.run_preview(STUDIO_PREVIEW_USE_CHECKOUT='true',DEPENDENCIES_CHANGED='1')
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any('merge' in c or 'build' in c or 'up' in c for c in calls))
        self.assertEqual(self.generations(calls),[])

    def test_recovery_views_saved_candidate_without_preflight_paid_calls_or_build(self):
        result,calls,archived,_=self.run_preview(saved=True,STUDIO_PREVIEW_USE_CHECKOUT='true',STUDIO_PREVIEW_RECOVER='true',STUDIO_PREVIEW_SHARE='true')
        self.assertEqual(result.returncode,0,result.stderr)
        recovery=[c for c in calls if '/repo/packages/core/scripts/recover-studio-preview.ts' in c]
        self.assertEqual(len(recovery),1);self.assertIn('LLM_PROVIDER=mock',recovery[0])
        self.assertEqual(self.generations(calls),[]);self.assertEqual(len(self.shares(calls)),1)
        self.assertFalse(any('--preflight' in c or 'build' in c or 'up' in c for c in calls))
        self.assertTrue(archived)

    def test_recovery_never_falls_back_to_paid_generation_when_artifacts_are_missing(self):
        for started in [False,True]:
            result,calls,_,_=self.run_preview(already_started=started,STUDIO_PREVIEW_RECOVER='true')
            self.assertNotEqual(result.returncode,0)
            self.assertFalse(any(c[0]=='docker' for c in calls))
            self.assertEqual(self.generations(calls),[])

    def test_failed_recovery_never_shares_or_generates(self):
        result,calls,_,_=self.run_preview(saved=True,STUDIO_PREVIEW_USE_CHECKOUT='true',STUDIO_PREVIEW_RECOVER='true',STUDIO_PREVIEW_SHARE='true',RECOVERY_FAIL='1')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.generations(calls),[]);self.assertEqual(self.shares(calls),[])

if __name__=='__main__':unittest.main()
