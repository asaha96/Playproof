// Convex Auth configuration for Clerk integration
// This tells Convex how to validate authentication tokens from Clerk

export default {
    providers: [
        {
            // The domain is derived from your Clerk publishable key
            // For pk_test_bmVlZGVkLWtvaS03OC5jbGVyay5hY2NvdW50cy5kZXYk
            // The domain is: needed-koi-78.clerk.accounts.dev
            domain: "https://needed-koi-78.clerk.accounts.dev",
            applicationID: "convex",
        },
    ],
};
