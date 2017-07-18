/// <reference path="typings/chrome.d.ts"/>
/// <reference path="typings/jQuery.d.ts"/>

/// <reference path="Log.ts"/>
/// <reference path="Models.ts"/>

// import {KickResult} from './Models';
// import {Log} from './Log';

namespace Kickstart {

    export class Popup {

        private urls: Array<string>;
        private results: Array<KickResult>;
        private resultsVisible: boolean;
        private rootUrl: string;

        constructor(){
            $('.confirmation .positive').on('click', event => this.ConfirmExecution(event));
            $('.confirmation .negative').on('click', event => this.CancelExecution(event));
        }

        public Run(rootUrl: string): void{

            this.rootUrl = rootUrl;

            this.urls = new Array<string>();
            this.results = new Array<KickResult>();

            this.resultsVisible = false;
            Log.Clear();
            $('progress').hide()
            $('.results').hide();
            $('.confirmation').hide();

            this.GetRobots().then(robotsFile => {
            
                // Validate the robots.txt is found
                if (robotsFile == null || robotsFile === '') {
                    Log.Warn('No robots.txt file found.');
                    return;
                } else {
                    Log.Info('Located robots.txt');
                }
                
                // Load the Sitemaps
                var sitemapUrls = this.GetSitemapUrls(robotsFile);

                var sitemapPromises = this.LoadSitemaps(sitemapUrls);
                
                Promise.all(sitemapPromises).then(sitemaps => {
                    
                    Log.Info("Found " + sitemaps.length + " sitemap" + (sitemaps.length > 1 ? "s" : ""));
                    
                    this.urls = [];
                    for(var sitemap of sitemaps) {

                        this.ParseSitemap(sitemap, this.urls);
                    }

                    Log.Info("Found " + this.urls.length + " urls")

                    // Prompt the user for confirmation
                    $('.confirmation').show();

                });

            });
        }

        // #region Event Handlers
        
        private ConfirmExecution(event: JQueryEventObject) {
            // Load the URLS
            this.ExecuteUrls();
        }

        private CancelExecution(event: JQueryEventObject) {

            window.close();
        }

        // #endregion

        private GetRobots(): Promise<string> {
            return fetch(this.rootUrl + '/robots.txt')
                .then((response) => {
                    return response.status === 200
                        ? response.text()
                        : '';
                });
        }

        private GetSitemapUrls (robots: string): Array<string> {

            var sitemaps = new Array<string>();

            if (robots != null && robots !== '') {
                
                // Extract any sitemap references from the robots file
                var siteMapsRows = robots.match(/sitemap:(.*)/gi);

                if(siteMapsRows != null){
                    for (var row of siteMapsRows) {

                        var sitemap = row.replace(/sitemap:\s?/i, '');
                        
                        // TODO: better URL formatting
                        sitemaps.push(
                            sitemap.indexOf('http') == 0
                            ? sitemap
                            : this.rootUrl + sitemap
                        );
                    }
                }

            }

            if (sitemaps.length < 1) {

                // If no sitemaps are found, default to common locations
                sitemaps.push(this.rootUrl + '/sitemap.xml');
                sitemaps.push(this.rootUrl + '/site-map.xml');
            }

            return sitemaps;
        }

        private LoadSitemaps (sitemaps: Array<string>): Array<Promise<string>> {

            var promises = new Array<Promise<string>>();

            for (var sitemap of sitemaps) {

                var promise = fetch(sitemap).then(response => {
                    return response.status === 200
                        ? response.text()
                        : '';
                });

                promises.push(promise);
            }

            return promises;
        }

        private ParseSitemap(sitemapXml:string, urls: Array<string>) {
            // TODO move urls to class scope

            let parser = new DOMParser();
            let sitemap = parser.parseFromString(sitemapXml, "text/xml");

            let sitemapLocs = sitemap.getElementsByTagName("loc");

            for (let index = 0; index < sitemapLocs.length; index++) {
                var url = $.trim(sitemapLocs[index].innerHTML);

                // Prevent duplicate urls
                if(url != '' && urls.indexOf(url) < 0) {
                    urls.push(url);
                }
            }

            let sitemapLinks = sitemap.getElementsByTagName("link");

            for (let index = 0; index < sitemapLinks.length; index++) {
                let url = $.trim(sitemapLinks[index].getAttribute("href"));

                // Prevent duplicate urls
                if(url != '' && urls.indexOf(url) < 0) {
                    urls.push(url);
                }
            }
        }

        private ExecuteUrls () {
            $('.confirmation').hide();
            
            for(var url of this.urls) {

                // Time the request
                let start = new Date().getTime();

                fetch(url).then(response => {
                    // Success
                    this.results.push(new KickResult(
                        true,
                        url,
                        new Date().getTime() - start
                    ));

                    this.RenderResults();

                }, response => {
                    // Fail
                    this.results.push(new KickResult(
                        false,
                        url,
                        new Date().getTime() - start
                    ));

                    this.RenderResults();
                });

            }
        }

        public RenderResults () {

            if(this.urls.length == this.results.length){
                Log.Info("Finished executing all "+ this.urls.length + " urls");
                $('progress').hide()
            }

            if(!this.resultsVisible){

                $('progress').show()
                $('.results').show();
                this.resultsVisible = true;
            }

            // Calculate the statistics

            let successes = 0;
            let failures = 0;
            let average = 0;
            let min = this.results[0];
            let max = this.results[0];

            for(let result of this.results) {

                average += result.Time;

                if(result.Time > max.Time)
                    max = result;
                
                if(result.Time < min.Time)
                    min = result;

                if(result.Success)
                    successes++;
                else
                    failures++;            
            }

            average = average / this.results.length;

            // Render the results

            $('progress').attr('value', this.results.length);
            $('progress').attr('max', this.urls.length);

            $('.results .successes span').html(successes.toString());
            $('.results .failures span').html(failures.toString());

            $('.results .min .time').html(min.Time.toString());
            $('.results .min').attr('title', min.Url.toString());

            $('.results .max .time').html(max.Time.toString());
            $('.results .max').attr('title', max.Url.toString());

            $('.results .average span').html(average.toFixed(0));
        }

    }

}

// Initialization
document.addEventListener('DOMContentLoaded', function () {

    var queryInfo = {
        active: true,
        currentWindow: true
    };

    // Find the current active tab
    chrome.tabs.query(queryInfo, function (tabs: chrome.tabs.Tab[]) {
        
        // Parse then root URL
        var rootUrl: string = tabs[0].url || "";
        rootUrl = rootUrl.match(/^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?([^\/\n\?\#]+)/)[0];

        console.log(`RootUrl: ${rootUrl}`);

        // Start the main app
        new Kickstart.Popup().Run(rootUrl);
    });

});