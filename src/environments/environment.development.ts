export const environment = {
  production: false,
  // Using the plain-HTTP Kestrel port (see the "Now listening on" lines when
  // ClothPOS.API starts) to sidestep the untrusted local dev HTTPS certificate.
  apiUrl: 'https://demoposcl.runasp.net/api'
};
