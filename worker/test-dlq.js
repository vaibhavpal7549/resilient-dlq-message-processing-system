/**
 * Quick Test Script for DLQ Worker
 * 
 * This script inserts test messages into MongoDB for testing the DLQ worker.
 * Run: node test-dlq.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection URI from environment or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dlq_system';

/**
 * Test message templates
 */
const testMessages = [
    {
        messageId: `test_temp_${Date.now()}_1`,
        originalMessage: {
            userId: 'user123',
            action: 'process_payment',
            amount: 100.50
        },
        errorReason: 'Connection timeout to payment gateway',
        errorStack: 'Error: ETIMEDOUT\n    at TCPConnectWrap.afterConnect',
        errorType: 'TIMEOUT_ERROR',
        description: 'TEMPORARY error - will be retried'
    },
    {
        messageId: `test_perm_${Date.now()}_2`,
        originalMessage: {
            userId: 'user456',
            action: 'create_account',
            email: 'invalid-email'
        },
        errorReason: 'Email validation failed',
        errorStack: 'ValidationError: Invalid email format',
        errorType: 'VALIDATION_ERROR',
        description: 'PERMANENT error - will be marked as failed'
    },
    {
        messageId: `test_unknown_${Date.now()}_3`,
        originalMessage: {
            userId: 'user789',
            action: 'complex_operation',
            data: { foo: 'bar' }
        },
        errorReason: 'Unexpected error occurred',
        errorStack: 'Error: Something went wrong',
        errorType: 'UNKNOWN_ERROR',
        description: 'UNKNOWN error - will require manual intervention'
    }
];

/**
 * Insert test messages into MongoDB
 */
async function insertTestMessages() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);

        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10
        });

        console.log('✅ Connected to MongoDB\n');

        const DLQMessage = mongoose.model('DLQMessage', new mongoose.Schema({}, { strict: false }));

        console.log('📝 Inserting test messages...\n');

        for (const template of testMessages) {
            const message = {
                messageId: template.messageId,
                originalMessage: template.originalMessage,
                errorReason: template.errorReason,
                errorStack: template.errorStack,
                errorType: template.errorType,
                retryCount: 3,
                dlqRetryCount: 0,
                firstFailedAt: new Date(),
                lastFailedAt: new Date(),
                status: 'dlq_pending',
                nextRetryAt: new Date(), // Ready for immediate processing
                lockedBy: null,
                lockedAt: null,
                metadata: {
                    source: 'test-script',
                    priority: 1,
                    tags: ['test', 'automated']
                },
                replayAttempts: []
            };

            await DLQMessage.create(message);

            console.log(`✅ Inserted: ${template.messageId}`);
            console.log(`   Type: ${template.errorType}`);
            console.log(`   Expected: ${template.description}\n`);
        }

        console.log('🎉 All test messages inserted successfully!\n');
        console.log('📊 Summary:');
        console.log(`   Total messages: ${testMessages.length}`);
        console.log(`   TEMPORARY errors: 1 (will retry)`);
        console.log(`   PERMANENT errors: 1 (will fail)`);
        console.log(`   UNKNOWN errors: 1 (manual review)\n`);

        console.log('🚀 Next steps:');
        console.log('   1. Start the worker: npm run dev');
        console.log('   2. Watch the logs for processing');
        console.log('   3. Verify results in MongoDB\n');

        // Show verification query
        console.log('🔍 Verify in MongoDB:');
        console.log(`   mongosh "${MONGODB_URI}"`);
        console.log(`   db.dlqmessages.find({ messageId: /^test_/ }).pretty()\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
    }
}

/**
 * Clean up test messages
 */
async function cleanupTestMessages() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
        console.log('✅ Connected to MongoDB\n');

        const DLQMessage = mongoose.model('DLQMessage', new mongoose.Schema({}, { strict: false }));

        console.log('🧹 Cleaning up test messages...');
        const result = await DLQMessage.deleteMany({
            messageId: /^test_/
        });

        console.log(`✅ Deleted ${result.deletedCount} test messages\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Main execution
const command = process.argv[2];

if (command === 'cleanup' || command === 'clean') {
    cleanupTestMessages();
} else if (command === 'help' || command === '--help') {
    console.log('DLQ Worker Test Script\n');
    console.log('Usage:');
    console.log('  node test-dlq.js          Insert test messages');
    console.log('  node test-dlq.js cleanup  Remove test messages');
    console.log('  node test-dlq.js help     Show this help\n');
} else {
    insertTestMessages();
}
