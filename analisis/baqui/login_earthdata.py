"""Guarda el login de Earthdata una sola vez (en el archivo .netrc del usuario).

Pide usuario y contraseña en la terminal. La contraseña no se muestra al escribirla.
"""
import earthaccess

auth = earthaccess.login(strategy="interactive", persist=True)
print("\nLogin guardado." if auth.authenticated else "\nNo se pudo entrar: revisá usuario y contraseña.")
