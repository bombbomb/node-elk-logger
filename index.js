module.exports = {

    settings: {
        host: 'elasticsearch.yourdomain.com:9200',
        elasticSearchIndexPrefix: 'projectName',
        logToConsole: true,
        esClient: undefined,
        messageDecorations: {}
    },

    configure: function(options){
        for (var property in options) {
            if (options.hasOwnProperty(property)) {
                this.settings[property] = options[property];
            }
        }
    },

    getElasticSearchClient: function() {
        if (typeof this.settings.esClient !== 'undefined') {
            var elasticsearch = require('elasticsearch');
            this.settings.esClient = new elasticsearch.Client({
                host: this.settings.host
            });
        }
        return this.settings.esClient;
    },
    log: function(message, type) {
        if (this.settings.logToConsole) {
            console.log(message);
        }

        var esMessage = message;
        if (typeof esMessage != 'string') {
            esMessage = JSON.stringify(message);
        }

        var now = new Date();

        var body = this.settings.messageDecorations;
        body.timestamp = now;
        body.message = esMessage;

        this.getElasticSearchClient().index({
            index: this.settings.elasticSearchIndexPrefix + '-' + now.getFullYear() + '.' + now.getMonth()+1 + '.' + now.getDate(),
            type: type,
            body: body
        }, function (error, response) {
            if (error) {
                console.log("Could not log to elasticsearch: " + error);
            } else {
                //console.log("elasticsearch response: " + response);
            }
        });
    },
    logInfo: function(message) { this.log(message, 'INFO') },
    logWarning: function(message) { this.log(message, 'WARN') },
    logError: function(message) { this.log(message, 'ERROR') }
};