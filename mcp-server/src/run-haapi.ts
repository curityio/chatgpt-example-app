import { callHaapi } from './authz';

async function main() {
    // TODO remove this line when running against a real https URL!
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
        console.log('Starting HAAPI call...');
        await callHaapi();
        console.log('HAAPI call completed successfully!');
    } catch (error) {
        console.error('Error calling HAAPI:', error);
        process.exit(1);
    }
}

main();