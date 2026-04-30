import pathlib
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.cpa_client import CPAClient, is_local_url


class IsLocalUrlTests(unittest.TestCase):
    def test_loopback_hostnames_are_local(self):
        self.assertTrue(is_local_url("http://localhost:8080"))
        self.assertTrue(is_local_url("http://Localhost/api"))
        self.assertTrue(is_local_url("http://api.localhost"))
        self.assertTrue(is_local_url("http://nas.local:9000"))

    def test_loopback_ips_are_local(self):
        self.assertTrue(is_local_url("http://127.0.0.1:8080"))
        self.assertTrue(is_local_url("http://[::1]:8080"))

    def test_private_ipv4_ranges_are_local(self):
        self.assertTrue(is_local_url("http://192.168.1.10"))
        self.assertTrue(is_local_url("http://10.0.0.5:8080"))
        self.assertTrue(is_local_url("http://172.16.5.6"))
        self.assertTrue(is_local_url("http://169.254.1.2"))

    def test_public_hosts_resolve_to_remote(self):
        with patch("src.cpa_client.socket.gethostbyname", return_value="93.184.216.34"):
            self.assertFalse(is_local_url("https://example.com"))

    def test_resolved_private_hostname_is_local(self):
        with patch("src.cpa_client.socket.gethostbyname", return_value="192.168.0.50"):
            self.assertTrue(is_local_url("http://my-cpa"))

    def test_unresolvable_hostname_is_not_local(self):
        import socket as _socket

        with patch("src.cpa_client.socket.gethostbyname", side_effect=_socket.gaierror):
            self.assertFalse(is_local_url("http://does-not-resolve.invalid"))

    def test_invalid_url_is_not_local(self):
        self.assertFalse(is_local_url(""))
        self.assertFalse(is_local_url("not-a-url"))


class CPAClientProxyBypassTests(unittest.TestCase):
    def test_proxy_is_dropped_for_local_endpoints(self):
        client = CPAClient("http://192.168.1.10:8080", "tok", proxy="http://proxy:7890")
        self.assertIsNone(client.proxies)

    def test_proxy_is_kept_for_remote_endpoints(self):
        with patch("src.cpa_client.socket.gethostbyname", return_value="93.184.216.34"):
            client = CPAClient("https://cpa.example.com", "tok", proxy="http://proxy:7890")
        self.assertEqual(client.proxies, {"http": "http://proxy:7890", "https": "http://proxy:7890"})

    def test_no_proxy_means_no_proxies_dict(self):
        client = CPAClient("http://192.168.1.10", "tok")
        self.assertIsNone(client.proxies)


if __name__ == "__main__":
    unittest.main()
