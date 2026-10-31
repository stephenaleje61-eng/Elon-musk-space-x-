/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["images.unsplash.com", "cdn.shopify.com", "i.ibb.co", "res.cloudinary.com"],
    unoptimized: true
  }
};

module.exports = nextConfig;
