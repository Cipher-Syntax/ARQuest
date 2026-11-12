"""Admin report builders and CSV export.

Every report returns the same shape so the web dashboard can render any of
them with one table component:

    {
        "report": "building-visits",
        "title": "Building Visit Report",
        "description": "...",
        "period": {"from": "2026-10-14", "to": "2026-11-12"} | None,
        "columns": [{"key": "building", "label": "Building", "align": "left"}],
        "rows": [{"building": "CCS Building", ...}],
        "summary": [{"label": "Total unlocks", "value": 128}],
    }

All aggregation happens here, on the server, so exports are never truncated by
client-side pagination. CSV output is produced from the same columns and rows.
"""

import csv
import io
from datetime import date, timedelta

from django.db.models import Avg, Count, Max, Min, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from apps.api.errors import ErrorCodes
from apps.api.models import Feedback
from apps.api.responses import error_response, success_response
from apps.authentication.models import User
from apps.buildings.models import Building, BuildingUnlock
from apps.gamification.models import Quest, UserQuestProgress
from apps.quizzes.models import QuizAttemptLog, QuizQuestion, TriviaFact

DEFAULT_PERIOD_DAYS = 30


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def _period(request, default_days=DEFAULT_PERIOD_DAYS):
    today = timezone.now().date()
    date_from = _parse_date(request.query_params.get("from"))
    date_to = _parse_date(request.query_params.get("to"))
    if date_from is None:
        date_from = today - timedelta(days=default_days - 1)
    if date_to is None:
        date_to = today
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    return date_from, date_to


def _bool_param(request, name, default=False):
    raw = request.query_params.get(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _building_id(request):
    return request.query_params.get("building") or None


def _department_id(request):
    return request.query_params.get("department") or None


def _scope_q(building_path, building_id, department_id):
    """Build a Q object scoping a queryset to a building and/or department.

    ``building_path`` is the ORM path from the current queryset to the
    Building instance, for example ``"building"`` or
    ``"quest_progress__quest__target_building"``.
    """
    scope = Q()
    if building_id:
        scope &= Q(**{f"{building_path}_id": building_id})
    if department_id:
        scope &= Q(**{f"{building_path}__primary_department_id": department_id}) | Q(
            **{f"{building_path}__departments__id": department_id}
        )
    return scope


def _building_queryset(request):
    buildings = (
        Building.objects.prefetch_related("geofences").order_by("name")
    )
    building_id = _building_id(request)
    department_id = _department_id(request)
    if building_id:
        buildings = buildings.filter(id=building_id)
    if department_id:
        buildings = buildings.filter(
            Q(primary_department_id=department_id)
            | Q(departments__id=department_id)
        ).distinct()
    return buildings


def _iso(value):
    return value.isoformat() if value else None


def _percent(part, total):
    return round((part / total) * 100, 1) if total else 0.0


def _summary(total_unlocks, unique_students, visited_buildings, total_buildings, top):
    return [
        {"label": "Student unlocks", "value": total_unlocks},
        {"label": "Unique students", "value": unique_students},
        {
            "label": "Buildings visited",
            "value": f"{visited_buildings} of {total_buildings}",
        },
        {"label": "Most visited", "value": top or "None"},
    ]


# ---------------------------------------------------------------------------
# 1. Building Visit Report
# ---------------------------------------------------------------------------


def build_building_visits(request):
    date_from, date_to = _period(request)
    include_demo = _bool_param(request, "include_demo", False)

    buildings = list(_building_queryset(request))
    building_ids = [b.id for b in buildings]

    unlocks = BuildingUnlock.objects.filter(
        building_id__in=building_ids,
        user__role="student",
        unlocked_at__date__gte=date_from,
        unlocked_at__date__lte=date_to,
    )
    if not include_demo:
        unlocks = unlocks.filter(is_demo=False)

    grouped = {
        str(row["building_id"]): row
        for row in unlocks.values("building_id").annotate(
            total=Count("id"),
            unique=Count("user", distinct=True),
            geofence=Count("id", filter=Q(source="geofence")),
            qr=Count("id", filter=Q(source="qr")),
            demo=Count("id", filter=Q(is_demo=True)),
            first_unlock=Min("unlocked_at"),
            last_unlock=Max("unlocked_at"),
        )
    }

    rows = []
    total_unlocks = 0
    visited_buildings = 0
    top_name = None
    top_count = -1

    for building in buildings:
        stats = grouped.get(str(building.id), {})
        total = stats.get("total") or 0
        unique = stats.get("unique") or 0
        geofence = building.geofences.all()
        active_geofence = next((g for g in geofence if g.is_active), None)

        total_unlocks += total
        if total > 0:
            visited_buildings += 1
        if total > top_count:
            top_count = total
            top_name = building.name

        rows.append(
            {
                "building": building.name,
                "status": building.get_status_display(),
                "is_active": "Active" if building.is_active else "Inactive",
                "geofence_radius": (
                    float(active_geofence.radius_meters)
                    if active_geofence
                    else None
                ),
                "total_unlocks": total,
                "unique_students": unique,
                "geofence_unlocks": stats.get("geofence") or 0,
                "qr_unlocks": stats.get("qr") or 0,
                "demo_unlocks": stats.get("demo") or 0,
                "avg_per_student": round(total / unique, 1) if unique else 0,
                "first_unlock": _iso(stats.get("first_unlock")),
                "last_unlock": _iso(stats.get("last_unlock")),
            }
        )

    # Unique students across the whole scope, independent of the per-building rows.
    unique_students = unlocks.aggregate(n=Count("user", distinct=True))["n"] or 0

    return {
        "report": "building-visits",
        "title": "Building Visit Report",
        "description": (
            "Student unlocks per building for the selected period, including "
            "how each visit was triggered."
        ),
        "period": {"from": str(date_from), "to": str(date_to)},
        "columns": [
            {"key": "building", "label": "Building", "align": "left"},
            {"key": "status", "label": "Status", "align": "left"},
            {"key": "total_unlocks", "label": "Student Unlocks", "align": "right"},
            {"key": "unique_students", "label": "Unique Students", "align": "right"},
            {"key": "geofence_unlocks", "label": "Geofence", "align": "right"},
            {"key": "qr_unlocks", "label": "QR", "align": "right"},
            {
                "key": "avg_per_student",
                "label": "Avg per Student",
                "align": "right",
            },
            {"key": "first_unlock", "label": "First Unlock", "align": "left"},
            {"key": "last_unlock", "label": "Last Unlock", "align": "left"},
        ],
        "rows": rows,
        "summary": _summary(
            total_unlocks,
            unique_students,
            visited_buildings,
            len(buildings),
            top_name if top_count > 0 else None,
        ),
    }


# ---------------------------------------------------------------------------
# 2. Student Engagement Report
# ---------------------------------------------------------------------------


def build_student_engagement(request):
    date_from, date_to = _period(request)
    include_demo = _bool_param(request, "include_demo", False)
    include_names = _bool_param(request, "include_names", True)
    building_id = _building_id(request)
    department_id = _department_id(request)

    scope = _scope_q("building_unlocks__building", building_id, department_id)
    quest_scope = _scope_q(
        "quest_progress__quest__target_building", building_id, department_id
    )
    quiz_scope = _scope_q("quiz_attempts__building", building_id, department_id)

    date_window = Q(
        building_unlocks__unlocked_at__date__gte=date_from,
        building_unlocks__unlocked_at__date__lte=date_to,
    )
    if not include_demo:
        date_window &= Q(building_unlocks__is_demo=False)
    unlock_filter = date_window & scope

    quest_filter = (
        Q(
            quest_progress__is_completed=True,
            quest_progress__completed_at__date__gte=date_from,
            quest_progress__completed_at__date__lte=date_to,
        )
        & quest_scope
    )
    quiz_filter = (
        Q(
            quiz_attempts__created_at__date__gte=date_from,
            quiz_attempts__created_at__date__lte=date_to,
        )
        & quiz_scope
    )
    correct_filter = quiz_filter & Q(quiz_attempts__is_correct=True)

    students = User.objects.filter(role="student")

    if building_id or department_id:
        activity_user_ids = (
            BuildingUnlock.objects.filter(
                _scope_q("building", building_id, department_id)
            ).values_list("user_id", flat=True)
        )
        quest_user_ids = UserQuestProgress.objects.filter(
            _scope_q("quest__target_building", building_id, department_id)
        ).values_list("user_id", flat=True)
        quiz_user_ids = QuizAttemptLog.objects.filter(
            _scope_q("building", building_id, department_id)
        ).values_list("user_id", flat=True)
        students = students.filter(
            Q(id__in=activity_user_ids)
            | Q(id__in=quest_user_ids)
            | Q(id__in=quiz_user_ids)
        )

    students = students.annotate(
        stat_buildings=Count(
            "building_unlocks", filter=unlock_filter, distinct=True
        ),
        stat_quests=Count("quest_progress", filter=quest_filter, distinct=True),
        stat_quiz_attempts=Count(
            "quiz_attempts", filter=quiz_filter, distinct=True
        ),
        stat_quiz_correct=Count(
            "quiz_attempts", filter=correct_filter, distinct=True
        ),
        stat_badges=Count("badges", distinct=True),
    ).order_by("-exploration_points", "username")

    rows = []
    active_students = 0
    total_unlocks = 0
    total_quests = 0
    total_quiz_attempts = 0
    total_quiz_correct = 0

    for index, student in enumerate(students, start=1):
        quiz_attempts = student.stat_quiz_attempts or 0
        quiz_correct = student.stat_quiz_correct or 0
        if (
            (student.stat_buildings or 0)
            or (student.stat_quests or 0)
            or quiz_attempts
        ):
            active_students += 1
        total_unlocks += student.stat_buildings or 0
        total_quests += student.stat_quests or 0
        total_quiz_attempts += quiz_attempts
        total_quiz_correct += quiz_correct

        display_name = f"Student {index:03d}"
        if include_names:
            full_name = f"{student.first_name} {student.last_name}".strip()
            display_name = full_name or student.username

        rows.append(
            {
                "student_id": str(student.id),
                "student": display_name,
                "email": student.email if include_names else "",
                "buildings_unlocked": student.stat_buildings or 0,
                "quests_completed": student.stat_quests or 0,
                "quiz_attempts": quiz_attempts,
                "quiz_correct": quiz_correct,
                "quiz_accuracy": _percent(quiz_correct, quiz_attempts),
                "badges_earned": student.stat_badges or 0,
                "exploration_points": student.exploration_points or 0,
                "streak_count": student.streak_count or 0,
                "last_login": _iso(student.last_login),
                "date_joined": _iso(student.date_joined),
                "account_status": "Active" if student.is_active else "Deactivated",
            }
        )

    columns = [
        {"key": "student", "label": "Student", "align": "left"},
    ]
    if include_names:
        columns = [
            {"key": "student_id", "label": "Student ID", "align": "left"},
            {"key": "student", "label": "Name", "align": "left"},
            {"key": "email", "label": "Email", "align": "left"},
        ]
    columns += [
        {"key": "buildings_unlocked", "label": "Buildings", "align": "right"},
        {"key": "quests_completed", "label": "Quests", "align": "right"},
        {"key": "quiz_attempts", "label": "Quiz Attempts", "align": "right"},
        {"key": "quiz_correct", "label": "Correct", "align": "right"},
        {"key": "quiz_accuracy", "label": "Accuracy %", "align": "right"},
        {"key": "badges_earned", "label": "Badges", "align": "right"},
        {"key": "exploration_points", "label": "Points", "align": "right"},
        {"key": "streak_count", "label": "Streak", "align": "right"},
        {"key": "last_login", "label": "Last Login", "align": "left"},
        {"key": "date_joined", "label": "Joined", "align": "left"},
        {"key": "account_status", "label": "Account", "align": "left"},
    ]

    return {
        "report": "student-engagement",
        "title": "Student Engagement Report",
        "description": (
            "Per-student activity for the selected period. Points, badges, and "
            "streaks are current totals. Names can be hidden for anonymized exports."
        ),
        "period": {"from": str(date_from), "to": str(date_to)},
        "columns": columns,
        "rows": rows,
        "summary": [
            {"label": "Students", "value": len(rows)},
            {"label": "Active in period", "value": active_students},
            {"label": "Building unlocks", "value": total_unlocks},
            {"label": "Quests completed", "value": total_quests},
            {
                "label": "Quiz accuracy",
                "value": f"{_percent(total_quiz_correct, total_quiz_attempts)}%",
            },
        ],
    }


# ---------------------------------------------------------------------------
# 3. Quest Performance Report
# ---------------------------------------------------------------------------


def build_quest_performance(request):
    date_from, date_to = _period(request)
    building_id = _building_id(request)
    department_id = _department_id(request)

    quests = Quest.objects.select_related("target_building").filter(is_active=True)
    scope = _scope_q("target_building", building_id, department_id)
    quests = quests.filter(scope).order_by("target_building__name", "title")

    progress = UserQuestProgress.objects.filter(
        quest__in=quests,
        user__role="student",
        is_completed=True,
        completed_at__date__gte=date_from,
        completed_at__date__lte=date_to,
    )
    grouped = {
        str(row["quest_id"]): row
        for row in progress.values("quest_id").annotate(
            completed=Count("id", distinct=True),
            last_completed=Max("completed_at"),
        )
    }

    assigned = {
        str(row["quest_id"]): row["assigned"]
        for row in UserQuestProgress.objects.filter(
            quest__in=quests, user__role="student"
        )
        .values("quest_id")
        .annotate(assigned=Count("id", distinct=True))
    }

    rows = []
    total_completed = 0
    completed_quests = 0
    today = timezone.now().date()

    for quest in quests:
        stats = grouped.get(str(quest.id), {})
        completed = stats.get("completed") or 0
        total_assigned = assigned.get(str(quest.id), 0)
        expired = bool(quest.expires_at and quest.expires_at.date() < today)
        total_completed += completed
        if completed:
            completed_quests += 1

        rows.append(
            {
                "quest": quest.title,
                "building": quest.target_building.name,
                "difficulty": quest.get_difficulty_display(),
                "reward_points": quest.reward_points,
                "state": "Expired" if expired else "Active",
                "assigned": total_assigned,
                "completed": completed,
                "completion_rate": _percent(completed, total_assigned),
                "last_completed": _iso(stats.get("last_completed")),
            }
        )

    return {
        "report": "quest-performance",
        "title": "Quest Performance Report",
        "description": (
            "Quest completion for the selected period. Assigned is the lifetime "
            "number of students who started the quest."
        ),
        "period": {"from": str(date_from), "to": str(date_to)},
        "columns": [
            {"key": "quest", "label": "Quest", "align": "left"},
            {"key": "building", "label": "Building", "align": "left"},
            {"key": "difficulty", "label": "Difficulty", "align": "left"},
            {"key": "state", "label": "State", "align": "left"},
            {"key": "reward_points", "label": "Reward", "align": "right"},
            {"key": "assigned", "label": "Assigned", "align": "right"},
            {"key": "completed", "label": "Completed", "align": "right"},
            {"key": "completion_rate", "label": "Completion %", "align": "right"},
            {"key": "last_completed", "label": "Last Completed", "align": "left"},
        ],
        "rows": rows,
        "summary": [
            {"label": "Active quests", "value": len(rows)},
            {"label": "Quests completed", "value": completed_quests},
            {"label": "Completions", "value": total_completed},
            {
                "label": "Overall completion",
                "value": (
                    f"{_percent(total_completed, sum(assigned.values()))}%"
                    if assigned
                    else "0%"
                ),
            },
        ],
    }


# ---------------------------------------------------------------------------
# 4. Quiz Performance Report
# ---------------------------------------------------------------------------


def build_quiz_performance(request):
    date_from, date_to = _period(request)
    building_id = _building_id(request)
    department_id = _department_id(request)

    questions = (
        QuizQuestion.objects.select_related("building")
        .filter(is_active=True)
        .order_by("building__name", "question")
    )
    scope = _scope_q("building", building_id, department_id)
    questions = questions.filter(scope)

    attempts = QuizAttemptLog.objects.filter(
        question__in=questions,
        user__role="student",
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )
    grouped = {
        str(row["question_id"]): row
        for row in attempts.values("question_id").annotate(
            total=Count("id", distinct=True),
            correct=Count("id", filter=Q(is_correct=True), distinct=True),
            avg_exp=Avg("exp_awarded"),
            last_attempt=Max("created_at"),
        )
    }

    rows = []
    total_attempts = 0
    total_correct = 0
    untouched = 0

    for question in questions:
        stats = grouped.get(str(question.id), {})
        total = stats.get("total") or 0
        correct = stats.get("correct") or 0
        if total == 0:
            untouched += 1
        total_attempts += total
        total_correct += correct

        rows.append(
            {
                "question": question.question,
                "building": question.building.name,
                "attempts": total,
                "correct": correct,
                "accuracy": _percent(correct, total),
                "avg_exp": round(stats.get("avg_exp") or 0, 1),
                "last_attempt": _iso(stats.get("last_attempt")),
            }
        )

    return {
        "report": "quiz-performance",
        "title": "Quiz Performance Report",
        "description": (
            "Student attempt volume and accuracy per question for the selected "
            "period."
        ),
        "period": {"from": str(date_from), "to": str(date_to)},
        "columns": [
            {"key": "question", "label": "Question", "align": "left"},
            {"key": "building", "label": "Building", "align": "left"},
            {"key": "attempts", "label": "Attempts", "align": "right"},
            {"key": "correct", "label": "Correct", "align": "right"},
            {"key": "accuracy", "label": "Accuracy %", "align": "right"},
            {"key": "avg_exp", "label": "Avg EXP", "align": "right"},
            {"key": "last_attempt", "label": "Last Attempt", "align": "left"},
        ],
        "rows": rows,
        "summary": [
            {"label": "Active questions", "value": len(rows)},
            {"label": "Attempts", "value": total_attempts},
            {
                "label": "Overall accuracy",
                "value": f"{_percent(total_correct, total_attempts)}%",
            },
            {"label": "Never attempted", "value": untouched},
        ],
    }


# ---------------------------------------------------------------------------
# 5. Content Readiness Report
# ---------------------------------------------------------------------------


def build_content_readiness(request):
    buildings = (
        _building_queryset(request)
        .annotate(
            stat_panorama_scenes=Count(
                "panorama_scenes",
                filter=Q(panorama_scenes__is_active=True),
                distinct=True,
            ),
            stat_panorama_hotspots=Count(
                "panorama_scenes__hotspots",
                filter=Q(panorama_scenes__hotspots__is_active=True),
                distinct=True,
            ),
            quest_count=Count(
                "quests", filter=Q(quests__is_active=True), distinct=True
            ),
            trivia_count=Count(
                "trivia_facts", filter=Q(trivia_facts__is_active=True), distinct=True
            ),
            quiz_count=Count(
                "quiz_questions",
                filter=Q(quiz_questions__is_active=True),
                distinct=True,
            ),
        )
        .order_by("name")
    )

    rows = []
    ready_count = 0
    model_count = 0
    panorama_count = 0

    for building in buildings:
        active_geofence = next(
            (g for g in building.geofences.all() if g.is_active), None
        )
        has_model = bool(building.model_file)
        if has_model:
            model_count += 1
        if building.stat_panorama_scenes:
            panorama_count += 1

        is_ready = bool(
            building.model_file
            and building.stat_panorama_scenes
            and building.quest_count
            and building.quiz_count
            and building.trivia_count
            and active_geofence
        )
        if is_ready:
            ready_count += 1

        rows.append(
            {
                "building": building.name,
                "status": building.get_status_display(),
                "is_active": "Active" if building.is_active else "Inactive",
                "geofence": (
                    f"{float(active_geofence.radius_meters):.0f} m"
                    if active_geofence
                    else "Not set"
                ),
                "has_model": "Yes" if has_model else "No",
                "model_active": "Yes" if building.model_active else "No",
                "model_version": building.model_version or "",
                "model_size_mb": (
                    round(building.model_file_size / (1024 * 1024), 2)
                    if building.model_file_size
                    else 0
                ),
                "has_thumbnail": "Yes" if building.image else "No",
                "panorama_scenes": building.stat_panorama_scenes,
                "panorama_hotspots": building.stat_panorama_hotspots,
                "quests": building.quest_count,
                "trivia_facts": building.trivia_count,
                "quiz_questions": building.quiz_count,
                "readiness": "Ready" if is_ready else "Incomplete",
                "updated_at": _iso(building.updated_at),
            }
        )

    total = len(rows)
    return {
        "report": "content-readiness",
        "title": "Building Content Readiness",
        "description": (
            "Snapshot of every building's geofence, 3D model, panorama, quest, "
            "trivia, and quiz coverage. Use it to spot empty exhibits."
        ),
        "period": None,
        "columns": [
            {"key": "building", "label": "Building", "align": "left"},
            {"key": "status", "label": "Status", "align": "left"},
            {"key": "geofence", "label": "Geofence", "align": "left"},
            {"key": "has_model", "label": "3D Model", "align": "left"},
            {"key": "model_active", "label": "Model Active", "align": "left"},
            {"key": "model_version", "label": "Version", "align": "left"},
            {"key": "model_size_mb", "label": "Model MB", "align": "right"},
            {"key": "has_thumbnail", "label": "Thumbnail", "align": "left"},
            {"key": "panorama_scenes", "label": "Panoramas", "align": "right"},
            {"key": "panorama_hotspots", "label": "Hotspots", "align": "right"},
            {"key": "quests", "label": "Quests", "align": "right"},
            {"key": "trivia_facts", "label": "Trivia", "align": "right"},
            {"key": "quiz_questions", "label": "Quiz", "align": "right"},
            {"key": "readiness", "label": "Readiness", "align": "left"},
            {"key": "updated_at", "label": "Last Updated", "align": "left"},
        ],
        "rows": rows,
        "summary": [
            {"label": "Buildings", "value": total},
            {"label": "Ready exhibits", "value": ready_count},
            {"label": "With 3D model", "value": model_count},
            {"label": "With panoramas", "value": panorama_count},
        ],
    }


# ---------------------------------------------------------------------------
# 6. Feedback and Issues Report
# ---------------------------------------------------------------------------


def build_feedback_report(request):
    date_from, date_to = _period(request)
    status_filter = request.query_params.get("status") or "all"
    type_filter = request.query_params.get("type") or "all"

    feedbacks = Feedback.objects.select_related("user").filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )
    if status_filter != "all":
        feedbacks = feedbacks.filter(status=status_filter)
    if type_filter != "all":
        feedbacks = feedbacks.filter(type=type_filter)
    feedbacks = feedbacks.order_by("-created_at")

    today = timezone.now().date()
    rows = []
    status_counts = {"open": 0, "in_progress": 0, "resolved": 0}
    aging = 0

    for item in feedbacks:
        status_counts[item.status] = status_counts.get(item.status, 0) + 1
        age_days = max((today - item.created_at.date()).days, 0)
        if item.status != "resolved" and age_days > 7:
            aging += 1
        rows.append(
            {
                "created_at": _iso(item.created_at),
                "type": item.get_type_display(),
                "status": item.get_status_display(),
                "user": item.user.username if item.user else "Anonymous",
                "role": item.user.get_role_display() if item.user else "Visitor",
                "message": item.message,
                "age_days": age_days,
            }
        )

    return {
        "report": "feedback",
        "title": "Feedback and Issues Report",
        "description": (
            "User-submitted bug reports, feature requests, and feedback with "
            "status and aging. Items older than 7 days that are still open are "
            "counted separately."
        ),
        "period": {"from": str(date_from), "to": str(date_to)},
        "columns": [
            {"key": "created_at", "label": "Date", "align": "left"},
            {"key": "type", "label": "Type", "align": "left"},
            {"key": "status", "label": "Status", "align": "left"},
            {"key": "user", "label": "User", "align": "left"},
            {"key": "role", "label": "Role", "align": "left"},
            {"key": "message", "label": "Message", "align": "left"},
            {"key": "age_days", "label": "Age (days)", "align": "right"},
        ],
        "rows": rows,
        "summary": [
            {"label": "Total", "value": len(rows)},
            {"label": "Open", "value": status_counts.get("open", 0)},
            {
                "label": "In progress",
                "value": status_counts.get("in_progress", 0),
            },
            {"label": "Resolved", "value": status_counts.get("resolved", 0)},
            {"label": "Open over 7 days", "value": aging},
        ],
    }


# ---------------------------------------------------------------------------
# Dispatch and CSV
# ---------------------------------------------------------------------------

REPORT_BUILDERS = {
    "building-visits": build_building_visits,
    "student-engagement": build_student_engagement,
    "quest-performance": build_quest_performance,
    "quiz-performance": build_quiz_performance,
    "content-readiness": build_content_readiness,
    "feedback": build_feedback_report,
}


def _csv_response(report):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([column["label"] for column in report["columns"]])
    for row in report["rows"]:
        writer.writerow(
            [
                "" if row.get(column["key"]) is None else row.get(column["key"])
                for column in report["columns"]
            ]
        )

    filename = f"arquest-{report['report']}-{timezone.now().date().isoformat()}.csv"
    response = HttpResponse(
        "\ufeff" + buffer.getvalue(),
        content_type="text/csv; charset=utf-8",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reports_view(request, report_type):
    if not request.user.is_admin_role:
        return error_response(
            ErrorCodes.PERMISSION_DENIED,
            "Admin access required",
            status_code=403,
        )

    builder = REPORT_BUILDERS.get(report_type)
    if builder is None:
        return error_response(
            ErrorCodes.NOT_FOUND,
            f"Unknown report type: {report_type}",
            status_code=404,
        )

    report = builder(request)

    # ``format`` is reserved by DRF for content negotiation, so the export
    # switch uses its own parameter name.
    if str(request.query_params.get("export", "json")).lower() == "csv":
        return _csv_response(report)

    return success_response(report)
