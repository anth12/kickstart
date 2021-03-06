﻿using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;

namespace Kickstart
{
    class Program
    {
        private static void Main(string[] args)
        {
            Console.WriteLine(string.Join(", ", args));

            var arguments = Arguments.Parse(args.ToList());

            if (arguments.Help)
            {
                Console.WriteLine();
                return;
            }
            
            MainAsync(arguments).Wait();

#if DEBUG
            Console.ReadLine();
#endif
        }

        static async Task MainAsync(Arguments args)
        {
            var url = args.Url;
            if (string.IsNullOrEmpty(url))
            {
                Console.WriteLine("URL to Kickstart:");
                url = Console.ReadLine();
            }


            Uri uri;
            if (Uri.TryCreate(url, UriKind.Absolute, out uri) == false)
            {
                Console.WriteLine("Invalid URL");
            }

            // TODO support entering a sitemap
            var baseUrl = uri.AbsoluteUri.EndsWith("/") ? uri.AbsoluteUri : uri.AbsoluteUri + "/";

            // Search for a robots.txt file
            var robotsFile = await GetRobots(baseUrl);

            // Extract the site-map url
            var siteMapPaths = FindSiteMapUrls(baseUrl, robotsFile);

            // Load the sitemap xml
            var siteMaps = GetSiteMapXml(siteMapPaths);

            // Parse the sitemap links
            var links = GetSitemapLinks(siteMaps)
                            .Distinct();

            if (!links.Any())
            {
                Console.WriteLine("Not links found. Ensure your site contains a sitemap");
                return;
            }

            if (!args.Force)
            {
                // Confirm
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Write(links.Count());
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine(" URL's will be executed. Are you sure? (y/n)");
                if (Console.ReadKey().Key != ConsoleKey.Y)
                {
                    return;
                }
            }

            Console.WriteLine();

            // Hit the sites
            var results = RequestUrls(links);

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("===============================");
            Console.WriteLine("=== Finished ==================");
            Console.WriteLine("===============================");
            Console.ForegroundColor = ConsoleColor.White;
            
            Console.WriteLine();

            var loadTimeOrderedResults = results.Values.OrderBy(r => r.LoadTime);

            var fastest = loadTimeOrderedResults.First();
            Console.WriteLine($"Fastest Load Time: [{fastest.LoadTime}] {fastest.Link}");

            var slowest = loadTimeOrderedResults.Last();
            Console.WriteLine($"Slowest Load Time: [{slowest.LoadTime}] {slowest.Link}");

        }


        private static async Task<string> GetRobots(string baseUrl)
        {
            using (var webClient = new WebClient())
            {
                try
                {
                    return await webClient.DownloadStringTaskAsync(baseUrl + "robots.txt");
                }
                catch
                {
                    Console.WriteLine("Robots.txt not found");
                    return null;
                }
            }
        }

        private static List<string> FindSiteMapUrls(string baseUrl, string robotsFile)
        {
            var results = new List<string>();
            if (!string.IsNullOrEmpty(robotsFile))
            {
                var siteMapMatches = Regex.Matches(robotsFile, @"(?<=sitemap:).*", RegexOptions.IgnoreCase);

                foreach (Match match in siteMapMatches)
                {
                    var siteMapUrl = match.Value.Trim();

                    results.Add(siteMapUrl.StartsWith("/")
                        ? baseUrl.Substring(0, baseUrl.Length - 1) + siteMapUrl
                        : siteMapUrl
                    );
                }
            }

            if (!results.Any())
            {
                // Use the default site map URL's
                results.Add(baseUrl + "sitemap.xml");
                results.Add(baseUrl + "site-map.xml");
            }

            return results;
        }

        private static List<string> GetSiteMapXml(List<string> siteMaps)
        {
            var result = new List<string>();

            Parallel.ForEach(siteMaps, (siteMap) =>
            {
                using (var webClient = new WebClient())
                {
                    try
                    {
                        var siteMapXml = webClient.DownloadStringTaskAsync(siteMap).Result;
                        result.Add(siteMapXml);
                    }
                    catch
                    {
                        Trace.WriteLine("Cannot find site map: " + siteMap);
                    }

                }
            });

            return result;
        }

        private static List<string> GetSitemapLinks(List<string> siteMaps)
        {
            var result = new List<string>();


            foreach (var siteMapXml in siteMaps)
            {
                var xml = new XmlDocument();
                xml.LoadXml(siteMapXml);

                var urlNodes = xml.DocumentElement.SelectNodes("//*[local-name()='url']");

                foreach (XmlNode node in urlNodes)
                {
                    // TODO ensure links are absolute

                    var url = node.SelectSingleNode("*[local-name()='loc']")?.InnerText;

                    if (!string.IsNullOrEmpty(url))
                        result.Add(url);

                    var alternateLinks = node.SelectNodes("*[local-name()='link']");

                    foreach (XmlNode link in alternateLinks)
                    {
                        if (!string.IsNullOrEmpty(link.InnerText))
                            result.Add(link.Value);
                    }

                }
            }

            return result;
        }

        private static IDictionary<string, WarmupResult> RequestUrls(IEnumerable<string> links)
        {
            var results = new ConcurrentDictionary<string, WarmupResult>();

            Parallel.ForEach(links, (link) =>
            {
                using (var webClient = new WebClient())
                {
                    var start = DateTime.Now;
                    WarmupResult result;
                    try
                    {
                        var r = webClient.DownloadStringTaskAsync(link).Result;
                        result = new WarmupResult
                        {
                            Link = link,
                            LoadTime = DateTime.Now - start,
                            ReponseCode = 200
                        };
                    }
                    catch (Exception ex)
                    {
                        // TODO extract response code
                        result = new WarmupResult
                        {
                            Link = link,
                            LoadTime = DateTime.Now - start,
                            ReponseCode = 404
                        };
                    }

                    results.TryAdd(link, result);
                    Console.ForegroundColor = result.ReponseCode == 200 ? ConsoleColor.White : ConsoleColor.Red;
                    Console.WriteLine($"[{result.ReponseCode}] [{result.LoadTime}] {link}");
                }
            });

            Console.ForegroundColor = ConsoleColor.White;

            return results;
        }

    }

    public class WarmupResult
    {
        public string Link { get; set; }
        public TimeSpan LoadTime { get; set; }
        public int ReponseCode { get; set; }
    }
}
