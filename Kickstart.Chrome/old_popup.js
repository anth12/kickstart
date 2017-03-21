/// <reference path="typings/chrome.d.ts"/>
/// <reference path="typings/jQuery.d.ts"/>


document.addEventListener('DOMContentLoaded', function () {

    var queryInfo = {
        active: true,
        currentWindow: true
    };

    // Find the current active tab
    chrome.tabs.query(queryInfo, function (tabs: chrome.tabs.Tab[]) {
        
        // Parse then root URL
        var rootUrl = tabs[0].url || "";
        rootUrl = rootUrl.match(/^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?([^\/\n\?\#]+)/)[0];

        // Start the main app
        app.init(rootUrl);
    });


});

var app = {
    
    /*rootUrl: null,
    urls: [],

    info: function (message) { this._writeLog(message, 'info'); },
    warn: function (message) { this._writeLog(message, 'warn'); },
    error: function (message) { this._writeLog(message, 'error'); },

    _writeLog: function(message, type) {
        $('ul.log').append('<li class="' + type + '">' +
                                message +
                            '</li>');
    },*/

    init: function(rootUrl) {
        this.rootUrl = rootUrl;

        // Reset the UI
        // app._resultsVisible = false;
        // $('ul.log').html('');
        // $('progress').hide()
        // $('.results').hide();
        // $('.confirmation').hide();

        // $('.confirmation .positive').on('click', app.confirmExecution);
        // $('.confirmation .negative').on('click', app.cancelExecution);

        // Find the robots file
        app.getRobots(function(robotsFile) {
            
            // Validate the robots.txt is found
            if (robotsFile == null || robotsFile === '') {
                app.warn('No robots.txt file found.');
                //$('.hidden').text('Could not locate robots.txt, ensure you have a valid file in the root directory.').show();
                return;
            } else {
                app.info('Located robots.txt');
            }

            // Load the Sitemaps
            var sitemaps = app.getSitemapUrls(robotsFile);

            app.loadSitemaps(sitemaps, function(sitemaps) {
                
                app.info("Found " + sitemaps.length + " sitemap" + (sitemaps.length > 1 ? "s" : ""));
                
                app.urls = [];
                for(var index in sitemaps) {
                    var sitemap = sitemaps[index];

                    app.parseSitemap(sitemap, app.urls);
                }

                app.info("Found " + app.urls.length + " urls")

                // Prompt the user for confirmation
                $('.confirmation').show();

            });
        });

    },

    getRobots: function (callback) {

        fetch(this.rootUrl + '/robots.txt').then(function(response) {
            return response.status === 200
                ? response.text()
                : '';
        }).then(function(response) {
            
            callback(response);
        });
    },

    getSitemapUrls: function(robots) {

        var sitemaps = String[];

        if (robots != null && robots !== '') {
            
            // Extract any sitemap references from the robots file
            var siteMapsRows = robots.match(/sitemap:(.*)/gi);

            for (var index in siteMapsRows) {
                var row = siteMapsRows[index];

                var sitemap = row.replace(/sitemap:\s?/i, '');

                sitemaps.push(
                    sitemap.indexOf('/') == 1
                    ? app.rootUrl + sitemap
                    : sitemap
                );
            }

        }

        if (sitemaps.length < 1) {

            // If no sitemaps are found, default to common locations
            sitemaps.push(this.rootUrl + '/sitemap.xml');
            sitemaps.push(this.rootUrl + '/site-map.xml');
        }

        return sitemaps;
    },

    loadSitemaps: function(sitemaps, callback) {

        var promises = Promise[];

        for (var index in sitemaps) {
            var sitemap = sitemaps[index];

            var promise = fetch(sitemap).then(function (response) {
                return response.status === 200
                    ? response.text()
                    : '';
            });

            promises.push(promise);
        }

        Promise.all(promises).then(callback);
    },

    parseSitemap: function(sitemapXml, urls) {

        var parser = new DOMParser();
        var sitemap = parser.parseFromString(sitemapXml, "text/xml");

        // xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue;
        var sitemapLocs = sitemap.getElementsByTagName("loc");

        for(var index in sitemapLocs) {
            var url = $.trim(sitemapLocs[index].innerHTML);

            // Prevent duplicate urls
            if(url != '' && urls.indexOf(url) < 0) {
                urls.push(url);
            }
        }

        var sitemapLinks = sitemap.getElementsByTagName("link");

        for(var index in sitemapLocs) {
            var url = $.trim(sitemapLocs[index].href);

            // Prevent duplicate urls
            if(url != '' && urls.indexOf(url) < 0) {
                urls.push(url);
            }
        }
    },

    cancelExecution: function(event) {

        window.close();
    },

    confirmExecution: function(event){

        // Load the URLS
        app.executeUrls(app.urls);
    },

    executeUrls: function(urls) {
        $('.confirmation').hide();
        
        var results = [];

        for(var index in urls) {
            var url = urls[index];

            // Time the request
            var start = new Date();

            fetch(url).then(function(response){
                // Success
                results.push({
                    success: true,
                    url: url,
                    time: new Date() - start
                });

                app.renderResults(urls, results);

            }, function(repsonse){
                // Fail
                results.push({
                    success: false,
                    url: url,
                    time: new Date() - start
                });

                app.renderResults(urls, results);
            });

        }
    },

    _resultsVisible: true,

    renderResults: function(urls, results) {

        if(urls.length == results.length){
            app.info("Finished executing all "+ urls.length + " urls");
            $('progress').hide()
        }

        if(!app._resultsVisible){

            $('progress').show()
            $('.results').show();
            app._resultsVisible = true;
        }

        // Calculate the statistics

        var successes = 0;
        var failures = 0;
        var average = 0;
        var min = results[0].time;
        var max = results[0].time;

        for(var index in results){
            var result = results[index];

            average += result.time;

            if(result.time > max)
                max = result.time;
            
            if(result.time < min)
                min = result.time;

            if(result.success)
                successes++;
            else
                failures++;
            
        }

        average = average / results.length;

        // Render the results

        $('progress').attr('value', results.length);
        $('progress').attr('max', urls.length);

        $('.results .successes span').html(successes);
        $('.results .failures span').html(failures);

        $('.results .min span').html(min);
        $('.results .max span').html(max);

        $('.results .average span').html(average.toFixed(0));
    }

}

document.addEventListener('DOMContentLoaded', function () {

    var queryInfo = {
        active: true,
        currentWindow: true
    };

    // Find the current active tab
    chrome.tabs.query(queryInfo, function (tabs) {
        
        // Parse then root URL
        var rootUrl = tabs[0].url.match(/^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?([^\/\n\?\#]+)/)[0];

        // Start the main app
        app.init(rootUrl);
    });


});