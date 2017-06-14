module.exports = {

    settings: {
        host: 'elasticsearch.yourdomain.com:9200',
        timeout: 30000,
        elasticSearchIndexPrefix: 'projectName',
        logToConsole: true,
        connectionFailureThreshold: 5,
        esClient: undefined,
        messageDecorations: {},
        level: 'WARN'
    },

    properties: {
        priorConnectErrorCount: 0
    },

    configure: function(options){
        for (var property in options) {
            if (options.hasOwnProperty(property)) {
                this.settings[property] = options[property];
            }
        }
    },

    getElasticSearchClient: function() {
        if (typeof this.settings.esClient === 'undefined') {
            var elasticsearch = require('elasticsearch');
            this.settings.esClient = new elasticsearch.Client({
                host: this.settings.host,
                requestTimeout: this.settings.timeout
            });
        }
        return this.settings.esClient;
    },
    log: function(message, type, payload) {
        if (this.settings.logToConsole) {
            console.log(message, payload);
        }

        if (typeof type !== 'string') {
            type = 'INFO';
        }

        if ((this.settings.level == 'WARN' && type == 'INFO') || (this.settings.level == 'ERROR' && type != 'ERROR'))
        {
            return;
        }

        var esMessage = message;
-       if (typeof esMessage !== 'string')
        {
            esMessage = JSON.stringify(esMessage);
        }
        if (typeof payload !== 'undefined')
        {
            if (typeof payload !== 'string')
            {
                payload = JSON.stringify(payload);
            }
            esMessage += '\n\nPayload: ' + payload
        }

        var elkInstance = this;
        var now = new Date();
        var dateMonth = now.getMonth() < 9 ? '0'+(now.getMonth()+1) : now.getMonth()+1;
        var body = this.settings.messageDecorations;
        body.timestamp = now;
        body.message = esMessage;

        if (this.settings.timeout > (10000) && this.properties.priorConnectErrorCount > 1)
        {
            this.getElasticSearchClient().ping({
                requestTimeout: 2000,
                // undocumented params are appended to the query string
                hello: "elasticsearch!"
            }, function (error) {
                if (error)
                {
                    elkInstance.properties.priorConnectErrorCount++;
                    console.trace('Elasticsearch cluster is down, sirs! Call teh Cawps');
                }
                else
                {
                    console.trace('Oh snap! Elasticsearch is back?!');
                    elkInstance.properties.priorConnectErrorCount = 0;
                }
            });

        }

        if (this.properties.priorConnectErrorCount < this.settings.connectionFailureThreshold)
        {
            try
            {
                this.getElasticSearchClient().index({
                    index: this.settings.elasticSearchIndexPrefix + '-' + now.getFullYear() + '.' + dateMonth + '.' + now.getDate(),
                    type: type,
                    body: body
                }, function (error, response) {
                    if (error) {
                        elkInstance.properties.priorConnectErrorCount++;
                        console.error("node-elk-logger: Connection failure; " + elkInstance.properties.priorConnectErrorCount+': '+error);
                    } else {
                        //console.log("elasticsearch response: " + response);
                    }
                });
            }
            catch (e)
            {
                console.error('node-elk-logger Fatal Error: '+e);
            }
        }

    },
    logInfo: function(message, payload) { this.log(message, 'INFO', payload) },
    logWarning: function(message, payload) { this.log(message, 'WARN', payload) },
    logError: function(message, payload) { this.log(message, 'ERROR', payload) }
};
