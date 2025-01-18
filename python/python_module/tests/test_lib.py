import unittest

class TestLib(unittest.TestCase):
    def test_add_1(self):
        self.assertEqual(1 + 1, 2)
        
    def test_add_2(self):
        self.assertEqual(1 + 2, 3)
