"""Pure local fixtures; no credentials, Docker, network or worker invocation."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('providers', Path(__file__).with_name('prepare-providers.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ProviderConfigTest(unittest.TestCase):
    def test_preserves_other_bytes_and_only_sets_test_modes(self):
        with tempfile.TemporaryDirectory() as root:
            p = Path(root)/'.env.worker'
            credentials = b"# private fixture\nEMAIL_API_KEY='fixture-mail'\nNETLIFY_API_TOKEN=fixture-hosting\nREGISTRAR_USER=fixture-only\nMODEL_CREATIVE=keep-model\n"
            p.write_bytes(credentials+b'EMAIL_PROVIDER=mock\nHOSTING_PROVIDER=mock\nSTRIPE_MODE=live\nDRY_RUN=false\n')
            before = p.read_bytes()
            module.prepare(p)
            self.assertEqual(before, p.read_bytes())
            result = module.prepare(p, True)
            self.assertFalse(result['workerRestarted'])
            self.assertTrue(p.read_bytes().startswith(credentials))
            self.assertIn(b'STRIPE_MODE=test\n', p.read_bytes())
            self.assertIn(b'REGISTRAR_PROVIDER=mock\n', p.read_bytes())
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)
            self.assertEqual(module.prepare(p, True)['changedKeys'], [])

    def test_refuses_duplicate_missing_credentials_and_symlink(self):
        with tempfile.TemporaryDirectory() as root:
            p = Path(root)/'.env.worker'
            for data in (b'EMAIL_API_KEY=fixture\n', b'EMAIL_API_KEY=fixture\nNETLIFY_API_TOKEN=fixture\nDRY_RUN=true\nDRY_RUN=false\n'):
                p.write_bytes(data)
                with self.assertRaises(ValueError):
                    module.prepare(p, True)
                self.assertEqual(p.read_bytes(), data)
            link = Path(root)/'link'
            link.symlink_to(p)
            with self.assertRaises(ValueError):
                module.prepare(link, True)


if __name__ == '__main__':
    unittest.main()
