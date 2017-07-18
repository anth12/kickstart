using System.IO;
using System.IO.Compression;

namespace Kickstart.Chrome.Build
{
    class Program
    {
        static void Main(string[] args)
        {

            var tempDirectory = $".temp-chrome-build";
            Directory.CreateDirectory(tempDirectory);

            try
            {
                var outputFile = $"build\\{ChromeManifest.Name()}_{ChromeManifest.IncrementedVersionNumber()}.zip";

                // Copy the compiled files
                foreach (var file in File.ReadAllLines("chrome-build.txt"))
                {
                    if (file.Contains("\\") || file.Contains("/"))
                    {
                        // create the nested directory

                    }

                    File.Copy(file, tempDirectory +"\\" + file, true);
                }

                if (!Directory.Exists("build"))
                    Directory.CreateDirectory("build");

                ZipFile.CreateFromDirectory(tempDirectory, outputFile);
            }
            finally
            {
                Directory.Delete(tempDirectory, true);
            }
        }
    }
}