import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('update-worker.sh')
RELEASE = 'd' * 40
FAKE = r'''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
name=Path(sys.argv[0]).name;a=sys.argv[1:]
with open(os.environ['CALLS'],'a') as f:f.write(json.dumps([name,*a])+'\n')
if name=='git':
 if a==['rev-parse','--show-toplevel']:print(os.environ['DIR'])
 if a and a[0]=='diff' and os.environ.get('DIRTY')=='1':sys.exit(1)
elif a[:2]==['ps','-aq']:print('existing-worker')
elif a and a[0]=='inspect':
 fmt=a[2]
 if '.State.Running' in fmt:print(os.environ['RUNNING'])
 elif '.Config.Env' in fmt:print('DRY_RUN='+os.environ['MODE'])
 elif '.Config.Labels' in fmt:print(os.environ['DIR']+'/docker-compose.worker.yml'+(','+os.environ['DIR']+'/docker-compose.worker.live.yml' if os.environ['MODE']=='false' else ''))
 else:print('healthy')
else:
 if 'config' in a:print(json.dumps({'services':{'worker':{'environment':{'DRY_RUN':os.environ.get('CONFIG_MODE',os.environ['MODE'])}}}}))
 if 'build' in a and os.environ.get('BUILD_FAIL')=='1':sys.exit(1)
 if 'run' in a and os.environ.get('IMAGE_FAIL')=='1':sys.exit(1)
 if 'ps' in a:print('new-worker')
'''

class WorkerUpdateTest(unittest.TestCase):
    def run_update(self, running='true', mode='true', **extra):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'.env.worker').write_text('PRIVATE_TOKEN=do-not-print\n')
            for n in ['docker-compose.worker.yml','docker-compose.worker.live.yml']:
                (root/n).write_text('services: {}\n')
            before=(root/'.env.worker').read_bytes()
            bins=root/'bin';bins.mkdir()
            for n in ['git','docker']:
                p=bins/n;p.write_text(FAKE);p.chmod(0o700)
            env={**os.environ,'PATH':str(bins)+':'+os.environ['PATH'],'DIR':tmp,'RELEASE':RELEASE,'CALLS':str(root/'calls'),'RUNNING':running,'MODE':mode,**extra}
            r=subprocess.run(['bash',str(SCRIPT)],env=env,text=True,capture_output=True)
            calls=[json.loads(s) for s in (root/'calls').read_text().splitlines()]
            self.assertEqual((root/'.env.worker').read_bytes(),before)
            self.assertNotIn('do-not-print',r.stdout+r.stderr)
            return r,calls
    def test_running_dry_and_live_preserved(self):
        for mode in ['true','false']:
            r,calls=self.run_update(mode=mode)
            self.assertEqual(r.returncode,0,r.stderr)
            self.assertTrue(any('up' in c for c in calls))
            build=next(c for c in calls if 'build' in c)
            self.assertEqual(any('live.yml' in s for s in build),mode=='false')
    def test_paused_worker_is_never_started(self):
        r,calls=self.run_update(running='false',mode='false')
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertTrue(any('create' in c for c in calls))
        self.assertFalse(any('up' in c for c in calls))
    def test_changed_configuration_blocks_before_build(self):
        r,calls=self.run_update(CONFIG_MODE='false')
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(any('build' in c or 'up' in c for c in calls))
    def test_dirty_code_is_not_overwritten(self):
        r,calls=self.run_update(DIRTY='1')
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(any('merge' in c or 'build' in c for c in calls))
    def test_failed_build_keeps_current_container(self):
        r,calls=self.run_update(BUILD_FAIL='1')
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(any('up' in c or 'create' in c for c in calls))
    def test_failed_image_verification_keeps_current_container(self):
        r,calls=self.run_update(IMAGE_FAIL='1')
        self.assertNotEqual(r.returncode,0)
        self.assertFalse(any('up' in c or 'create' in c for c in calls))

if __name__=='__main__':unittest.main()
