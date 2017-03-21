
using System;
using System.Collections.Generic;
using System.Linq;

namespace Kickstart
{
    public class Arguments
    {
        public Arguments(bool help, bool force, string url)
        {
            Help = help;
            Force = force;
            Url = url;
        }

        public bool Help { get; set; }
        public bool Force { get; set; }
        public string Url { get; set; }

        public static Arguments Parse(List<string> args)
        {
            if(args == null)
                return new Arguments(false, false, null);

            var remainingParams = args.Count;
            args.RemoveAll(a => a == "/?" || a == "help" || a == "-help");

            var help = remainingParams > args.Count;

            remainingParams = args.Count;
            args.RemoveAll(a => a == "-f");
            var force = remainingParams > args.Count;

            remainingParams = args.Count;
            string url = null;

            if (args.Count == 1)
            {
                url = args[0];
            }

            return new Arguments(help, force, url);
        }
    }
}
