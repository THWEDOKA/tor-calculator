import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Убирает dev-виджет "Route / Turbopack" (Next.js on-screen indicator)
  devIndicators: false,
  // Фикс для предупреждения про неверный workspace root (из-за лишних lockfiles вне проекта)
  turbopack: {
    root: __dirname,
  },
  // pywebview может грузить страницу как 127.0.0.1, а dev-сервер стартует на localhost → разрешаем оба.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
