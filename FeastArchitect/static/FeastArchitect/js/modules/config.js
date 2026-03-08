/**
 * Configuration Module
 * 
 * Contains all static configuration, color schemes, node dimensions,
 * and comprehensive database type definitions for the Feast diagram.
 * 
 * File: config.js
 * Location: FeastArchitect/static/FeastArchitect/js/modules/config.js
 * 
 * @module Config
 */

/**
 * @typedef {Object} DatabaseType
 * @property {string} name - Display name of the database
 * @property {string} category - Category classification (Relational, NoSQL, etc.)
 * @property {boolean} debezium - Whether Debezium CDC is supported
 * @property {string} icon - Emoji icon for the database
 * @property {string} defaultProcess - Default access process description
 * @property {string} sparkPattern - Spark connector pattern to use
 */

/**
 * Comprehensive database type definitions
 * Supports 30+ database types across multiple categories
 * @type {Object.<string, DatabaseType>}
 */
const DATABASE_TYPES = {
    // Relational Databases
    postgres: {
        name: 'PostgreSQL',
        category: 'Relational',
        debezium: true,
        icon: '🐘',
        defaultProcess: 'Submit DBA ticket for read replica access',
        sparkPattern: 'JDBC batch read with partition column'
    },
    mysql: {
        name: 'MySQL',
        category: 'Relational',
        debezium: true,
        icon: '🐬',
        defaultProcess: 'Request via MySQL Workbench access form',
        sparkPattern: 'JDBC connector with predicate pushdown'
    },
    sqlserver: {
        name: 'SQL Server',
        category: 'Relational',
        debezium: true,
        icon: '🗃️',
        defaultProcess: 'AD group membership request',
        sparkPattern: 'MS JDBC driver with bulk copy'
    },
    oracle: {
        name: 'Oracle',
        category: 'Relational',
        debezium: true,
        icon: '🏛️',
        defaultProcess: 'DBA approval required, VPN only',
        sparkPattern: 'OCI driver with connection pooling'
    },
    sqlite: {
        name: 'SQLite',
        category: 'Relational',
        debezium: false,
        icon: '🪶',
        defaultProcess: 'File system access request',
        sparkPattern: 'Direct file read via Spark'
    },
    
    // NoSQL Databases
    mongodb: {
        name: 'MongoDB',
        category: 'NoSQL',
        debezium: true,
        icon: '🍃',
        defaultProcess: 'MongoDB Atlas invitation',
        sparkPattern: 'MongoDB Spark connector with aggregation pipeline'
    },
    dynamodb: {
        name: 'DynamoDB',
        category: 'NoSQL',
        debezium: false,
        icon: '⚡',
        defaultProcess: 'IAM policy update via ServiceNow',
        sparkPattern: 'DynamoDB Export to S3 + Spark read'
    },
    cassandra: {
        name: 'Cassandra',
        category: 'NoSQL',
        debezium: true,
        icon: '🔱',
        defaultProcess: 'CQL role grant by DBA team',
        sparkPattern: 'Spark Cassandra connector with token range scan'
    },
    couchbase: {
        name: 'Couchbase',
        category: 'NoSQL',
        debezium: true,
        icon: '🛋️',
        defaultProcess: 'Bucket access request',
        sparkPattern: 'Couchbase Spark connector'
    },
    elasticsearch: {
        name: 'Elasticsearch',
        category: 'NoSQL',
        debezium: true,
        icon: '🔍',
        defaultProcess: 'Kibana role assignment',
        sparkPattern: 'ES-Hadoop connector with scroll API'
    },
    
    // Cloud Warehouses
    snowflake: {
        name: 'Snowflake',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '❄️',
        defaultProcess: 'Role grant via Snowflake UI',
        sparkPattern: 'Snowflake Spark connector with external stages'
    },
    bigquery: {
        name: 'BigQuery',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '📊',
        defaultProcess: 'IAM BigQuery Data Viewer role',
        sparkPattern: 'BigQuery Storage API + Spark'
    },
    redshift: {
        name: 'Redshift',
        category: 'Cloud Warehouse',
        debezium: true,
        icon: '🔺',
        defaultProcess: 'Security group + user creation',
        sparkPattern: 'Redshift JDBC with UNLOAD to S3'
    },
    databricks: {
        name: 'Databricks Delta Lake',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '🧱',
        defaultProcess: 'Unity Catalog grant',
        sparkPattern: 'Native Delta Lake read'
    },
    synapse: {
        name: 'Azure Synapse',
        category: 'Cloud Warehouse',
        debezium: false,
        icon: '🔷',
        defaultProcess: 'Azure AD + Synapse workspace access',
        sparkPattern: 'Synapse Spark pool with dedicated SQL pool'
    },
    
    // Streaming Platforms
    kafka: {
        name: 'Apache Kafka',
        category: 'Streaming',
        debezium: false,
        icon: '📨',
        defaultProcess: 'Self-service via Kafka Manager',
        sparkPattern: 'Spark Structured Streaming with Kafka source'
    },
    kinesis: {
        name: 'AWS Kinesis',
        category: 'Streaming',
        debezium: false,
        icon: '💧',
        defaultProcess: 'IAM role for Kinesis read',
        sparkPattern: 'Kinesis Client Library + Spark'
    },
    pulsar: {
        name: 'Apache Pulsar',
        category: 'Streaming',
        debezium: true,
        icon: '⭐',
        defaultProcess: 'Pulsar tenant admin request',
        sparkPattern: 'Pulsar Spark connector'
    },
    eventhubs: {
        name: 'Azure Event Hubs',
        category: 'Streaming',
        debezium: true,
        icon: '🎯',
        defaultProcess: 'Event Hubs Data Receiver role',
        sparkPattern: 'Azure Event Hubs connector for Spark'
    },
    
    // Object Storage
    s3: {
        name: 'Amazon S3 (Parquet)',
        category: 'Object Storage',
        debezium: false,
        icon: '🪣',
        defaultProcess: 'S3 bucket policy update',
        sparkPattern: 'S3A filesystem with Parquet reader'
    },
    gcs: {
        name: 'Google Cloud Storage',
        category: 'Object Storage',
        debezium: false,
        icon: '☁️',
        defaultProcess: 'GCS bucket IAM binding',
        sparkPattern: 'GCS connector with Parquet'
    },
    azureblob: {
        name: 'Azure Blob Storage',
        category: 'Object Storage',
        debezium: false,
        icon: '🔵',
        defaultProcess: 'Storage Blob Data Reader role',
        sparkPattern: 'Azure Blob File System (ABFS)'
    },
    minio: {
        name: 'MinIO',
        category: 'Object Storage',
        debezium: false,
        icon: '🪣',
        defaultProcess: 'MinIO policy assignment',
        sparkPattern: 'S3A compatible API'
    },
    
    // In-Memory Stores
    redis: {
        name: 'Redis',
        category: 'In-Memory',
        debezium: false,
        icon: '🔴',
        defaultProcess: 'Redis ACL set via config',
        sparkPattern: 'Redis Spark connector for batch'
    },
    memcached: {
        name: 'Memcached',
        category: 'In-Memory',
        debezium: false,
        icon: '🧠',
        defaultProcess: 'Security group ingress rule',
        sparkPattern: 'Custom Spark input format'
    },
    dragonfly: {
        name: 'Dragonfly',
        category: 'In-Memory',
        debezium: false,
        icon: '🐉',
        defaultProcess: 'Dragonfly ACL configuration',
        sparkPattern: 'Redis-compatible connector'
    },
    
    // Graph Databases
    neo4j: {
        name: 'Neo4j',
        category: 'Graph',
        debezium: true,
        icon: '🕸️',
        defaultProcess: 'Neo4j role assignment',
        sparkPattern: 'Neo4j Spark connector with APOC'
    },
    neptune: {
        name: 'Amazon Neptune',
        category: 'Graph',
        debezium: false,
        icon: '🌊',
        defaultProcess: 'VPC security group + IAM auth',
        sparkPattern: 'Gremlin Spark integration'
    },
    
    // Time-Series Databases
    influxdb: {
        name: 'InfluxDB',
        category: 'Time-Series',
        debezium: false,
        icon: '📈',
        defaultProcess: 'InfluxDB token generation',
        sparkPattern: 'InfluxDB Spark connector'
    },
    timescaledb: {
        name: 'TimescaleDB',
        category: 'Time-Series',
        debezium: true,
        icon: '⏱️',
        defaultProcess: 'PostgreSQL access (Timescale extension)',
        sparkPattern: 'PostgreSQL JDBC with time_bucket'
    },
    clickhouse: {
        name: 'ClickHouse',
        category: 'Time-Series',
        debezium: true,
        icon: '🖱️',
        defaultProcess: 'ClickHouse user creation',
        sparkPattern: 'ClickHouse Native JDBC + Spark'
    },
    
    // Others
    couchdb: {
        name: 'CouchDB',
        category: 'Document',
        debezium: true,
        icon: '🛋️',
        defaultProcess: 'CouchDB _security object update',
        sparkPattern: 'CouchDB Spark connector with _changes feed'
    },
    rethinkdb: {
        name: 'RethinkDB',
        category: 'Document',
        debezium: false,
        icon: '🤔',
        defaultProcess: 'RethinkDB user grant',
        sparkPattern: 'Custom Spark source with changefeeds'
    },
    firebase: {
        name: 'Firebase',
        category: 'Mobile/Realtime',
        debezium: false,
        icon: '🔥',
        defaultProcess: 'Firebase Admin SDK service account',
        sparkPattern: 'Firebase to BigQuery export + Spark'
    },
    supabase: {
        name: 'Supabase',
        category: 'Backend-as-a-Service',
        debezium: true,
        icon: '⚡',
        defaultProcess: 'Supabase RLS policy + service role',
        sparkPattern: 'PostgreSQL JDBC (Supabase is Postgres)'
    }
};

/**
 * Color and styling configuration for different node types
 * @type {Object.<string, NodeTypeConfig>}
 */
const NODE_CONFIG = {
    datasource: {
        bg: '#3b82f6',
        light: '#60a5fa',
        icon: '🗄️',
        label: 'Data Source'
    },
    entity: {
        bg: '#8b5cf6',
        light: '#a78bfa',
        icon: '👤',
        label: 'Entity'
    },
    featureview: {
        bg: '#10b981',
        light: '#34d399',
        icon: '📊',
        label: 'Feature View'
    },
    service: {
        bg: '#f97316',
        light: '#fb923c',
        icon: '🚀',
        label: 'Feature Service'
    }
};

/**
 * Node dimension constants
 * @type {Object}
 */
const DIMENSIONS = {
    nodeWidth: 200,
    nodeHeight: 100,
    portRadius: 6
};

/**
 * Export configuration objects for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DATABASE_TYPES, NODE_CONFIG, DIMENSIONS };
}
