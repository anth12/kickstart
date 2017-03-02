
var app = {
    
    rootUrl: null,

    info: function (message) { this._writeLog(message, 'info'); },
    warn: function (message) { this._writeLog(message, 'warn'); },
    error: function (message) { this._writeLog(message, 'error'); },

    _writeLog: function(message, type) {
        $('ul.log').append('<li class="' + type + '">' +
                                message +
                            '</li>');
    },

    init: function(rootUrl) {
        this.rootUrl = rootUrl;

        // Clear the log
        $('ul.log').html('');

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
                
                var urls = [];
                for(var index in sitemaps) {
                    var sitemap = sitemaps[index];

                    app.parseSitemap(sitemap, urls);
                }

                app.info("Found " + urls.length + " urls")

                // Load the URLS
                app.executeUrls(urls);

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

        var sitemaps = [];

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

        var promises = [];

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

    executeUrls: function(urls) {

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

    renderResults: function(urls, results) {
        if(urls.length == result.length){
            app.info("Finished executing all "+ urls.length + " urls");
        }

        
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