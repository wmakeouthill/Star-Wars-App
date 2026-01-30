from app.application.services.gamification_service import GamificationService


def test_record_query_unlocks_primeiro_contato_and_adds_xp():
    service = GamificationService()

    unlocked = service.record_query("user-1", 5)
    user = service.get_user_profile("user-1")

    assert user.total_queries == 1
    assert user.total_xp >= 5
    assert any(a.id == "primeiro_contato" for a in user.achievements)
    assert any(a.id == "primeiro_contato" for a in unlocked)


def test_record_chat_triggers_daily_challenge_and_achievement():
    service = GamificationService()

    for _ in range(5):
        service.record_chat_message("user-2", 1)

    user = service.get_user_profile("user-2")

    assert user.chat_messages == 5
    assert any(a.id == "amigo_yoda" for a in user.achievements)

    daily = service.get_daily_challenge("user-2")
    assert daily["progress_current"] is not None
    assert daily["progress_target"] == 3
    assert daily["completed"] is True


def test_leaderboard_orders_by_xp_desc():
    service = GamificationService()

    service.record_query("a", 5)
    service.record_query("b", 5)
    service.record_query("b", 5)

    leaderboard = service.get_leaderboard(limit=10)
    assert leaderboard[0].user_id == "b"
