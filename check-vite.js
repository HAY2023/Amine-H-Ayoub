import http from 'http';

http.get('http://127.0.0.1:5174', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    if (data.includes('vite-error')) {
      console.log("Vite error found in HTML!");
      const match = data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
      if (match) console.log(match[1].replace(/<[^>]+>/g, ''));
    } else {
      console.log("No vite-error in HTML.");
    }
  });
}).on('error', (err) => {
  console.log("Error fetching:", err.message);
});
