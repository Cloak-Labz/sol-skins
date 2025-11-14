// Access to image at 'https://community.fastly.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyL8ypexwjFS4_ega6F_H_iHMWaS0vpkseJ9cD66mxkYvzSCkpu3dSnCPFJxXJZ2RrEP4Ri8k4a1Yu_j7w3e3okTzXr92ytA5ilrsroDUr1lpPMn2xt0Zg/360fx360f' from origin 'https://d6b032e80123.ngrok-free.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'community.fastly.steamstatic.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;