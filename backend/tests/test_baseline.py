from app.engine.baseline import robust_z, should_flag


def test_needs_min_history():
    assert robust_z(10, [10, 11, 12]) is None


def test_normal_value_is_near_zero():
    z = robust_z(11, [10, 11, 12, 11, 10, 12, 11])
    assert abs(z) < 1


def test_outlier_is_large():
    assert robust_z(20, [10, 11, 12, 11, 10, 12, 11]) > 2


def test_flag_requires_two_in_a_row_same_direction():
    assert should_flag(3, 2.5)
    assert not should_flag(3, 1)
    assert not should_flag(3, -3)
    assert not should_flag(None, 3)
