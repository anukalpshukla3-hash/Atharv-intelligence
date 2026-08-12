export const env = {
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  uploadFolder: process.env.NEXT_PUBLIC_UPLOAD_FOLDER ?? 'user',
};
