/**
 * Example Data Module
 * 
 * Provides a comprehensive multi-source architecture example
 * with 10 data sources, 5 entities, 9 feature views, and 5 services.
 * 
 * File: example-data.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/example-data.js
 * 
 * @module ExampleData
 */

/**
 * Loads complex example architecture into the diagram
 * @param {NodeManager} nodeManager - Node manager instance
 * @param {Function} addConnection - Function to create connections
 * @param {Function} autoLayout - Function to trigger auto-layout
 */
function loadComplexExample(nodeManager, addConnection, autoLayout) {
    // ==========================================
    // DATA SOURCES (10 sources across categories)
    // ==========================================
    
    // 1. PostgreSQL with Debezium CDC
    const userDb = nodeManager.addDataSource({
        name: 'User Database',
        kind: 'postgres',
        description: 'Primary transactional database with user profiles and authentication data',
        ownedBy: 'Platform Team',
        accessProcess: '1. Submit request in ServiceNow\n2. Get approval from Platform Team lead\n3. Credentials delivered via Vault',
        tags: ['critical', 'pii', 'platform'],
        details: { 
            connection: 'postgresql://prod.db.internal:5432/users',
            notes: 'Owner: Platform Team\nSLA: 99.99%\nBackup: Daily snapshots\nEncryption: AES-256 at rest'
        }
    });
    
    // 2. MongoDB (NoSQL with Debezium)
    const mongoEvents = nodeManager.addDataSource({
        name: 'Event Store',
        kind: 'mongodb',
        description: 'NoSQL event store for user activity streams',
        ownedBy: 'Analytics Team',
        accessProcess: 'Contact analytics-oncall@company.com for read replicas',
        tags: ['analytics', 'stream'],
        details: {
            connection: 'mongodb://analytics.mongo.internal:27017/events',
            notes: 'Debezium CDC enabled\nRequires Spark streaming job\nRetention: 30 days'
        }
    });
    
    // 3. Kafka (Streaming)
    const kafkaStream = nodeManager.addDataSource({
        name: 'Kafka Stream',
        kind: 'kafka',
        description: 'Real-time event streaming platform',
        ownedBy: 'Streaming Team',
        accessProcess: 'Self-service via Kafka Manager UI',
        tags: ['streaming', 'real-time'],
        details: {
            connection: 'kafka.prod.internal:9092',
            topic: 'user-events',
            notes: 'Topic: user-events\nRetention: 7 days\nPartitions: 24'
        }
    });
    
    // 4. Snowflake (Cloud Warehouse)
    const dataWarehouse = nodeManager.addDataSource({
        name: 'Snowflake Warehouse',
        kind: 'snowflake',
        description: 'Enterprise data warehouse for analytics',
        ownedBy: 'Data Engineering',
        accessProcess: 'Request access via internal Data Portal',
        tags: ['warehouse', 'analytics', 'batch'],
        details: {
            connection: 'snowflake://prod.warehouse/ANALYTICS',
            notes: 'Role-based access control\nTime travel: 90 days\nCredit usage monitored'
        }
    });
    
    // 5. DynamoDB (NoSQL without Debezium)
    const dynamoCache = nodeManager.addDataSource({
        name: 'DynamoDB Cache',
        kind: 'dynamodb',
        description: 'Low-latency cache for session data',
        ownedBy: 'Backend Team',
        accessProcess: 'IAM role escalation required',
        tags: ['cache', 'low-latency'],
        details: {
            connection: 'dynamodb://us-east-1/session-cache',
            notes: 'PushSource via Lambda streams\nTTL: 24 hours\nRCU/WCU: auto-scaling'
        }
    });
    
    // 6. Redis (In-Memory)
    const redisCache = nodeManager.addDataSource({
        name: 'Redis Cache',
        kind: 'redis',
        description: 'In-memory store for real-time features',
        ownedBy: 'Platform Team',
        accessProcess: 'Redis ACL set via config',
        tags: ['cache', 'in-memory', 'fast'],
        details: {
            connection: 'redis://redis.internal:6379',
            notes: 'Cluster mode enabled\nEviction: allkeys-lru\nMaxmemory: 64GB'
        }
    });
    
    // 7. S3 (Object Storage)
    const s3Store = nodeManager.addDataSource({
        name: 'S3 Data Lake',
        kind: 's3',
        description: 'Parquet files for historical batch processing',
        ownedBy: 'Data Platform',
        accessProcess: 'S3 bucket policy update via IAM',
        tags: ['datalake', 'parquet', 'batch'],
        details: {
            connection: 's3://data-lake-prod/features/',
            notes: 'Partitioned by date\nFormat: Parquet\nCompression: Snappy'
        }
    });
    
    // 8. Neo4j (Graph)
    const graphDb = nodeManager.addDataSource({
        name: 'Graph Database',
        kind: 'neo4j',
        description: 'Graph relationships for fraud detection',
        ownedBy: 'Security Team',
        accessProcess: 'Security review required',
        tags: ['graph', 'fraud', 'relationships'],
        details: {
            connection: 'bolt://neo4j.internal:7687',
            notes: 'Debezium CDC via plugin\nGraph algorithms: GDS\nEncryption: SSL'
        }
    });
    
    // 9. Elasticsearch (Search)
    const searchIndex = nodeManager.addDataSource({
        name: 'Search Index',
        kind: 'elasticsearch',
        description: 'Full-text search and log analytics',
        ownedBy: 'Search Team',
        accessProcess: 'Kibana role assignment',
        tags: ['search', 'logs', 'analytics'],
        details: {
            connection: 'https://elasticsearch.internal:9200',
            notes: 'Debezium CDC enabled\nIndices: daily rollover\nShards: 5 primary'
        }
    });
    
    // 10. InfluxDB (Time-Series)
    const timeSeriesDb = nodeManager.addDataSource({
        name: 'Metrics Store',
        kind: 'influxdb',
        description: 'Time-series metrics and monitoring data',
        ownedBy: 'Observability Team',
        accessProcess: 'InfluxDB token generation',
        tags: ['metrics', 'time-series', 'monitoring'],
        details: {
            connection: 'http://influxdb.internal:8086',
            notes: 'Retention: 90 days\nDownsampling: continuous queries\nPrecision: nanosecond'
        }
    });
    
    // ==========================================
    // ENTITIES (5 core business entities)
    // ==========================================
    
    const user = nodeManager.addEntity({
        name: 'User',
        joinKey: 'user_id',
        description: 'Registered application users across all platforms',
        tags: ['core', 'pii'],
        details: {
            notes: '100M+ users globally\nGDPR compliant\nPII masking required\nJoins: user_id (string)'
        }
    });
    
    const session = nodeManager.addEntity({
        name: 'Session',
        joinKey: 'session_id',
        description: 'Ephemeral user sessions for real-time features',
        tags: ['ephemeral', 'real-time'],
        details: {
            notes: 'TTL: 4 hours\nHigh cardinality\nUsed for real-time personalization'
        }
    });
    
    const product = nodeManager.addEntity({
        name: 'Product',
        joinKey: 'product_id',
        description: 'Product catalog with variants and categories',
        tags: ['catalog', 'reference'],
        details: {
            notes: '2.5M active products\nUpdated: hourly\nCategories: hierarchical'
        }
    });
    
    const merchant = nodeManager.addEntity({
        name: 'Merchant',
        joinKey: 'merchant_id',
        description: 'Seller accounts with risk profiles',
        tags: ['seller', 'risk'],
        details: {
            notes: '50K active merchants\nKYC verified\nRisk scoring enabled'
        }
    });
    
    const device = nodeManager.addEntity({
        name: 'Device',
        joinKey: 'device_fingerprint',
        description: 'Device fingerprinting for fraud detection',
        tags: ['fraud', 'security'],
        details: {
            notes: 'Fingerprinting via JS SDK\nBot detection enabled\nPrivacy compliant'
        }
    });
    
    // ==========================================
    // FEATURE VIEWS - Batch (4 views)
    // ==========================================
    
    const userDemographics = nodeManager.addFeatureView({
        name: 'User Demographics',
        subtype: 'batch',
        description: 'Static user attributes from registration and profile updates',
        entities: [user],
        tags: ['profile', 'batch', 'pii'],
        features: [
            {
                name: 'user_age', type: 'Int64',
                description: 'User age derived from birth date',
                tags: ['demographic', 'pii'],
                owner: 'Platform Team',
                sourceColumn: 'birth_date',
                transformation: 'EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))',
                defaultValue: '0',
                validation: { min: 0, max: 150, nullable: false },
                serving: { online: true, offline: true, ttl: 86400 },
                security: { pii: true, sensitive: false, classification: 'internal' },
                quality: { freshness: 'daily', completeness: 98.5, accuracy: 99.9 },
                statistics: { mean: 34.5, stdDev: 12.3, nullCount: 120, distinctCount: 89 }
            },
            {
                name: 'country_code', type: 'String',
                description: 'ISO 3166-1 alpha-2 country code from registration',
                tags: ['geographic'],
                owner: 'Platform Team',
                sourceColumn: 'registration_country',
                defaultValue: 'US',
                validation: { nullable: false },
                serving: { online: true, offline: true, ttl: 86400 },
                security: { pii: false, classification: 'public' },
                quality: { freshness: 'daily', completeness: 99.8, accuracy: 99.5 },
                statistics: { nullCount: 22, distinctCount: 195 }
            },
            {
                name: 'account_tier', type: 'String',
                description: 'Customer subscription tier level',
                tags: ['billing', 'segmentation'],
                owner: 'Growth Team',
                sourceColumn: 'subscription_tier',
                validation: { nullable: false },
                serving: { online: true, offline: true, ttl: 3600 },
                security: { pii: false, classification: 'internal' },
                quality: { freshness: 'hourly', completeness: 100, accuracy: 99.99 },
                statistics: { nullCount: 0, distinctCount: 4 }
            },
            { name: 'gender', type: 'String', description: 'Self-reported gender', tags: ['demographic','pii'], security: { pii: true }, serving: { online: false, offline: true } },
            { name: 'signup_date', type: 'String', description: 'Account creation timestamp', tags: ['lifecycle'], serving: { online: true, offline: true } },
            { name: 'language_preference', type: 'String', description: 'UI language setting', serving: { online: true, offline: false } },
            { name: 'timezone', type: 'String', description: 'User local timezone', serving: { online: true, offline: false } }
        ],
        details: {
            ttl: '86400',
            notes: 'Updated daily via Airflow\nBackfill: 5 years\nQuality: 99.5% complete\nPII: hashed in online store'
        }
    });
    
    const userTransactions = nodeManager.addFeatureView({
        name: 'Transaction History',
        subtype: 'batch',
        description: 'Aggregated purchase history and spending patterns',
        entities: [user],
        tags: ['financial', 'sensitive', 'batch'],
        features: [
            { name: 'total_lifetime_spend', type: 'Float32' },
            { name: 'order_count_30d', type: 'Int64' },
            { name: 'avg_order_value', type: 'Float32' },
            { name: 'favorite_category', type: 'String' },
            { name: 'days_since_last_order', type: 'Int64' },
            { name: 'refund_rate', type: 'Float32' },
            { name: 'payment_methods_used', type: 'Int64' }
        ],
        details: {
            ttl: '86400',
            notes: 'Updated hourly\nSensitive: financial data\nAudit: required\nEncryption: column-level'
        }
    });
    
    const productCatalog = nodeManager.addFeatureView({
        name: 'Product Catalog Features',
        subtype: 'batch',
        description: 'Product embeddings and catalog metadata',
        entities: [product],
        tags: ['catalog', 'embeddings', 'ml'],
        features: [
            { name: 'category_embedding', type: 'Float32' },
            { name: 'price_percentile', type: 'Float32' },
            { name: 'stock_availability', type: 'String' },
            { name: 'seller_rating', type: 'Float32' },
            { name: 'return_rate', type: 'Float32' },
            { name: 'view_to_purchase_ratio', type: 'Float32' }
        ],
        details: {
            ttl: '14400',
            notes: 'Embeddings: 128-dim\nUpdated: every 4 hours\nSource: Snowflake\nModel: BERT-based'
        }
    });
    
    const merchantRiskProfile = nodeManager.addFeatureView({
        name: 'Merchant Risk Profile',
        subtype: 'batch',
        description: 'Risk indicators and trust scores for merchants',
        entities: [merchant],
        tags: ['risk', 'compliance', 'fraud'],
        features: [
            { name: 'chargeback_rate_30d', type: 'Float32' },
            { name: 'account_age_days', type: 'Int64' },
            { name: 'risk_score', type: 'Float32' },
            { name: 'kyc_verified', type: 'Bool' },
            { name: 'suspicious_activity_flag', type: 'Bool' },
            { name: 'avg_settlement_time', type: 'Int64' }
        ],
        details: {
            ttl: '86400',
            notes: 'Sensitive: compliance data\nOwner: Risk Team\nAccess: restricted\nModel: XGBoost classifier'
        }
    });
    
    // ==========================================
    // FEATURE VIEWS - Stream (2 views)
    // ==========================================
    
    const userBehaviorStream = nodeManager.addFeatureView({
        name: 'User Behavior Stream',
        subtype: 'stream',
        description: 'Real-time behavioral features from clickstream',
        entities: [user, session],
        tags: ['real-time', 'behavior', 'ml'],
        features: [
            { name: 'page_views_5m', type: 'Int64' },
            { name: 'clicks_5m', type: 'Int64' },
            { name: 'scroll_depth_avg', type: 'Float32' },
            { name: 'time_on_site_5m', type: 'Int64' },
            { name: 'bounce_rate_1h', type: 'Float32' },
            { name: 'session_duration', type: 'Int64' },
            { name: 'referrer_category', type: 'String' }
        ],
        details: {
            ttl: '3600',
            notes: 'Window: 5 minutes\nLatency: <100ms p99\nSource: Kafka\nAggregation: tumbling window'
        }
    });
    
    const deviceFingerprint = nodeManager.addFeatureView({
        name: 'Device Intelligence',
        subtype: 'stream',
        description: 'Device-level fraud signals and reputation',
        entities: [device],
        tags: ['fraud', 'security', 'real-time'],
        features: [
            { name: 'device_reputation_score', type: 'Float32' },
            { name: 'bot_probability', type: 'Float32' },
            { name: 'vpn_proxy_detected', type: 'Bool' },
            { name: 'device_age_hours', type: 'Int64' },
            { name: 'associated_accounts_count', type: 'Int64' }
        ],
        details: {
            ttl: '7200',
            notes: 'Source: DynamoDB streams\nLatency: <50ms\nIntegration: MaxMind\nML: real-time inference'
        }
    });
    
    // ==========================================
    // FEATURE VIEWS - On-Demand (1 view)
    // ==========================================
    
    const sessionContext = nodeManager.addFeatureView({
        name: 'Session Context',
        subtype: 'on_demand',
        description: 'Computed session features for real-time personalization',
        entities: [session],
        tags: ['on-demand', 'real-time', 'context'],
        features: [
            { name: 'contextual_discount_eligible', type: 'Bool' },
            { name: 'ab_test_variant', type: 'String' },
            { name: 'device_type', type: 'String' },
            { name: 'geo_region', type: 'String' }
        ],
        details: {
            notes: 'On-demand transformation\nNo TTL (computed live)\nSource: request context\nPerformance: <10ms compute'
        }
    });
    
    // ==========================================
    // FEATURE VIEWS - Cross-Source (1 view)
    // ==========================================
    
    const unifiedUserProfile = nodeManager.addFeatureView({
        name: 'Unified User Profile',
        subtype: 'batch',
        description: 'Comprehensive user profile combining Postgres, MongoDB, and S3 data',
        entities: [user],
        tags: ['unified', 'cross-source', 'batch'],
        features: [
            { name: 'engagement_score', type: 'Float32' },
            { name: 'lifetime_value_predicted', type: 'Float32' },
            { name: 'churn_risk_score', type: 'Float32' },
            { name: 'preferred_channel', type: 'String' },
            { name: 'segment', type: 'String' }
        ],
        details: {
            ttl: '86400',
            notes: 'Joins: User DB + Event Store + S3 historical\nSpark job: hourly\nModel: Ensemble classifier'
        }
    });
    
    // ==========================================
    // SERVICES (5 feature services)
    // ==========================================
    
    const recommendationService = nodeManager.addService({
        name: 'Recommendation API',
        description: 'Personalized product recommendations for homepage and product pages',
        features: [userDemographics, userBehaviorStream, userTransactions, productCatalog, unifiedUserProfile],
        tags: ['recommendations', 'personalization', 'core'],
        details: {
            usedBy: [
                { name: 'web-frontend', environment: 'Production', sla: '99.9%', contact: 'web-team@company.com', description: 'Main e-commerce website' },
                { name: 'mobile-app', environment: 'Production', sla: '99.9%', contact: 'mobile-team@company.com', description: 'iOS and Android apps' },
                { name: 'email-service', environment: 'Production', sla: '99.5%', contact: 'marketing-tech@company.com', description: 'Personalized email campaigns' }
            ],
            notes: 'QPS: 15K peak\nLatency p99: 45ms\nDeploy: k8s-feast\nModel: Two-tower neural network\nCache: Redis 1 hour TTL'
        }
    });
    
    const fraudDetectionService = nodeManager.addService({
        name: 'Fraud Detection',
        description: 'Real-time transaction fraud scoring and risk assessment',
        features: [userDemographics, userTransactions, merchantRiskProfile, deviceFingerprint, unifiedUserProfile],
        tags: ['fraud', 'security', 'critical'],
        details: {
            usedBy: [
                { name: 'payment-gateway', environment: 'Production', sla: '99.99%', contact: 'payments@company.com', description: 'Payment processing pipeline' },
                { name: 'risk-dashboard', environment: 'Production', sla: '99.5%', contact: 'risk-ops@company.com', description: 'Analyst investigation UI' },
                { name: 'merchant-onboarding', environment: 'Production', sla: '99.9%', contact: 'merchant-team@company.com', description: 'New seller verification' }
            ],
            notes: 'QPS: 8K\nLatency p99: 30ms\nCritical: blocking path\nModel: Ensemble XGBoost + DL\nAlerting: PagerDuty integration'
        }
    });
    
    const searchRankingService = nodeManager.addService({
        name: 'Search Ranking',
        description: 'Learned ranking features for search and category pages',
        features: [productCatalog, userBehaviorStream, userDemographics, unifiedUserProfile],
        tags: ['search', 'ranking', 'ml'],
        details: {
            usedBy: [
                { name: 'search-service', environment: 'Production', sla: '99.9%', contact: 'search-team@company.com', description: 'Elasticsearch integration' },
                { name: 'category-pages', environment: 'Production', sla: '99.5%', contact: 'web-team@company.com', description: 'Browse navigation' }
            ],
            notes: 'QPS: 12K\nLatency p99: 35ms\nModel: LambdaMART\nA/B test: 5% holdout\nFeature importance logged'
        }
    });
    
    const analyticsWarehouseService = nodeManager.addService({
        name: 'Analytics Features',
        description: 'Batch features for BI, reporting, and data science',
        features: [userTransactions, productCatalog, merchantRiskProfile, userDemographics, unifiedUserProfile],
        tags: ['analytics', 'batch', 'warehouse'],
        details: {
            usedBy: [
                { name: 'bi-dashboard', environment: 'Production', sla: '95%', contact: 'analytics@company.com', description: 'Tableau dashboards' },
                { name: 'data-science', environment: 'Development', sla: 'Best effort', contact: 'ds-platform@company.com', description: 'Jupyter notebooks' },
                { name: 'executive-reports', environment: 'Production', sla: '99%', contact: 'bi-team@company.com', description: 'Weekly business reports' }
            ],
            notes: 'Batch only\nSchedule: hourly\nOutput: Snowflake\nNo online serving\nCost: $2K/month compute'
        }
    });
    
    const realTimePersonalization = nodeManager.addService({
        name: 'Real-Time Personalization',
        description: 'Session-based personalization using on-demand features',
        features: [sessionContext, userBehaviorStream],
        featureServices: [recommendationService],
        tags: ['real-time', 'personalization', 'composite'],
        details: {
            usedBy: [
                { name: 'promo-engine', environment: 'Production', sla: '99.9%', contact: 'growth@company.com', description: 'Dynamic pricing and offers' },
                { name: 'cart-abandonment', environment: 'Production', sla: '99.5%', contact: 'crm@company.com', description: 'Recovery campaigns' }
            ],
            notes: 'Composite service\nOn-demand + precomputed\nLatency: <20ms\nUses Recommendation API as base'
        }
    });
    
    // ==========================================
    // ADDITIONAL CROSS-SOURCE CONNECTIONS
    // ==========================================
    
    // Add manual connections for sources that feed into views
    // These would typically be handled by the data source selection in the view,
    // but we add explicit edges for visualization clarity
    
    addConnection(s3Store, unifiedUserProfile);
    addConnection(graphDb, fraudDetectionService);
    addConnection(searchIndex, searchRankingService);
    addConnection(timeSeriesDb, analyticsWarehouseService);
    
    // Trigger auto-layout
    if (autoLayout) {
        autoLayout();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = loadComplexExample;
}
