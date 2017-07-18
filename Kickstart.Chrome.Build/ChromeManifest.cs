using System.IO;
using System.Text.RegularExpressions;

namespace Kickstart.Chrome.Build
{
    internal class ChromeManifest
    {
        private static string _manifest;
        private static string Manifest {
            get
            {
             
                if (_manifest != null)
                    return _manifest;
                return _manifest = File.ReadAllText("manifest.json");
            }
            set
            {
                File.WriteAllText("manifest.json", value);
            }
        }

        public static string IncrementedVersionNumber()
        {
            var versionRegex = new Regex(@"(?<=""version"":\s?"")(.*)(?="")");

            var version = int.Parse(versionRegex.Match(Manifest).Value.Replace(".", ""));

            version++;
            var versionText = version.ToString();

            while (versionText.Length < 3)
                versionText = "0" + versionText;

            var newVersion = string.Join(".", versionText.ToCharArray());

            Manifest = versionRegex.Replace(Manifest, newVersion);

            return newVersion;
        }

        public static string Name()
        {
            var nameRegex = new Regex(@"(?<=""name"":\s?"")(.*)(?="")");

            return nameRegex.Match(Manifest).Value;
        }
    }
}
