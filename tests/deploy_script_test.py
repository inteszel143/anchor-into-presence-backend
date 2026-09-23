"""Exercise release switching with fake services; no network or production files."""
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest


class DeploymentTests(unittest.TestCase):
    def run_deploy(self, failure="", major="15"):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        deploy_root = root / "deployment"
        live = deploy_root / "current"
        previous = deploy_root / "releases/legacy"
        previous.mkdir(parents=True)
        live.symlink_to(previous, target_is_directory=True)
        (root / 'app').symlink_to(live, target_is_directory=True)
        (live / ".next").mkdir(parents=True)
        (live / ".next/BUILD_ID").write_text("old-build")
        (live / "src/lib").mkdir(parents=True)
        (live / "src/lib/serviceAccountKey.json").write_text("{}")
        (live / "public/uploads").mkdir(parents=True)
        (live / "public/uploads/photo").write_text("preserved")
        release = root / "source"
        (release / "src/lib").mkdir(parents=True)
        (release / "package-lock.json").write_text("{}")
        (release / "tests").mkdir()
        archive = root / "release.tar.gz"
        with tarfile.open(archive, "w:gz") as output:
            output.add(release, arcname=".")
        binaries = root / "bin"
        binaries.mkdir()
        mocks = {
            "flock": "#!/bin/bash\nexit 0\n",
            "node": '''#!/bin/bash
if [[ "$1" == -p ]]; then
  if [[ "$2" == *package-lock* ]]; then echo "$TARGET_MAJOR"; else echo 15; fi
elif [[ "$1" == -e ]]; then cat >/dev/null; fi
''',
            "npm": '''#!/bin/bash
if [[ "$*" == *build* ]]; then
  [[ "$FAILURE" != build ]] || exit 1
  mkdir -p .next; echo new-build > .next/BUILD_ID
fi
''',
            "pm2": '#!/bin/bash\necho "$*" >> "$MOCK_LOG"\n',
            "curl": '''#!/bin/bash
if [[ "$FAILURE" == health ]]; then echo 500; else echo 400; fi
''',
            "sleep": "#!/bin/bash\nexit 0\n",
        }
        for name, source in mocks.items():
            target = binaries / name
            target.write_text(source)
            target.chmod(0o700)
        script = (Path(__file__).parents[1] / "scripts/deploy-aws.sh").read_text()
        script = script.replace(
            'export PATH="/home/ubuntu/.nvm/versions/node/v22.23.2/bin:$PATH"',
            f'export PATH="{binaries}:$PATH"')
        script = script.replace('/var/www/html/meditation-main', str(root / 'app'))
        script = script.replace('/var/www/meditation-deploy', str(deploy_root))
        runner = root / "deploy.sh"
        runner.write_text(script)
        log = root / "pm2.log"
        result = subprocess.run(
            ["bash", str(runner), str(archive), "a" * 40],
            env={**os.environ, "HOME": str(root), "FAILURE": failure,
                 "TARGET_MAJOR": major, "MOCK_LOG": str(log)},
            capture_output=True, text=True, timeout=15)
        return result, live, log

    def test_build_failure_keeps_live_untouched(self):
        result, live, log = self.run_deploy("build")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((live / ".next/BUILD_ID").read_text(), "old-build")
        self.assertNotIn("stop meditation", log.read_text())

    def test_unapproved_major_upgrade_is_blocked(self):
        result, live, log = self.run_deploy(major="16")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("requires a separately tested upgrade", result.stdout)
        self.assertEqual(live.resolve().name, 'legacy')
        self.assertNotIn("stop meditation", log.read_text())

    def test_success_preserves_uploads_and_old_build(self):
        result, live, _ = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue(live.is_symlink())
        self.assertEqual((live / ".next/BUILD_ID").read_text().strip(), "new-build")
        self.assertEqual((live / "public/uploads/photo").read_text(), "preserved")
        previous = Path((live.parent.parent / "meditation-deploy/previous-release").read_text().strip())
        self.assertEqual((previous / ".next/BUILD_ID").read_text(), "old-build")

    def test_failed_health_check_rolls_back(self):
        result, live, log = self.run_deploy("health")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((live / ".next/BUILD_ID").read_text(), "old-build")
        self.assertEqual(log.read_text().count("restart meditation"), 2)


if __name__ == "__main__":
    unittest.main()
