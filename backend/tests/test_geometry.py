from app.core.geometry import has_line_of_sight, is_visible, segments_intersect


def test_segments_intersect_detects_a_proper_crossing():
    assert segments_intersect((0, 0), (10, 10), (0, 10), (10, 0)) is True


def test_segments_intersect_false_for_non_crossing_segments():
    assert segments_intersect((0, 0), (1, 0), (0, 5), (1, 5)) is False


def test_segments_intersect_false_for_parallel_segments():
    assert segments_intersect((0, 0), (10, 0), (0, 1), (10, 1)) is False


def test_has_line_of_sight_true_with_no_walls():
    assert has_line_of_sight((0, 0), (100, 100), []) is True


def test_has_line_of_sight_false_when_a_wall_crosses_the_path():
    wall = ((50, -50), (50, 50))
    assert has_line_of_sight((0, 0), (100, 0), [wall]) is False


def test_has_line_of_sight_true_when_wall_does_not_cross():
    wall = ((50, 10), (50, 60))
    assert has_line_of_sight((0, 0), (100, 0), [wall]) is True


def test_is_visible_false_outside_radius():
    assert is_visible((200, 0), (0, 0), 100, []) is False


def test_is_visible_true_inside_radius_with_no_obstruction():
    assert is_visible((50, 0), (0, 0), 100, []) is True


def test_is_visible_false_when_a_wall_blocks_the_light():
    wall = ((25, -25), (25, 25))
    assert is_visible((50, 0), (0, 0), 100, [wall]) is False


def test_is_visible_false_for_zero_or_negative_radius():
    assert is_visible((0, 0), (0, 0), 0, []) is False
