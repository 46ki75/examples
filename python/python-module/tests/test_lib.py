from python_module.lib import add


def test_add_positive() -> None:
    assert add(1, 1) == 2


def test_add_mixed() -> None:
    assert add(1, 2) == 3
