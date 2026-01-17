// Convex auth configuration for Clerk
// The domain is your Clerk issuer URL
// The applicationID should match your Clerk JWT template audience (commonly "convex")

export default {
  providers: [
    {
      domain: "https://needed-koi-78.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
