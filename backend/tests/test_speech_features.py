from app.engine.speech_features import speech_features


def test_empty():
    assert speech_features([])["wordCount"] == 0


def test_counts_pauses_and_wpm():
    words = [("hi", 0.0, 0.3), ("there", 0.35, 0.6), ("friend", 1.6, 2.0)]
    f = speech_features(words)
    assert f["wordCount"] == 3
    assert f["avgPauseMs"] == 1000.0
    assert f["wpm"] == 90.0
