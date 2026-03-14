from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_users: int
    total_courses: int
    total_enrollments: int
    active_students: int


class DetailedAnalytics(BaseModel):
    completion_rate: float
    avg_quiz_score: float | None
    avg_code_pass_rate: float | None
    enrollments_over_time: list[dict]  # [{date, count}]
    top_courses: list[dict]  # [{id, title, enrollment_count}]
    lesson_type_distribution: list[dict]  # [{type, count}]
