from django.contrib import admin
from django.urls import include, path

from app.views import (
    home,
    landing,
    login_view,
    logout_view,
    register_view,
)


urlpatterns = [
    path("admin/", admin.site.urls),

    path("", home, name="home"),

    path(
        "about/",
        landing,
        name="landing"
    ),

    path(
        "",
        include("app.urls")
    ),

    path(
        "register/",
        register_view,
        name="register"
    ),

    path(
        "login/",
        login_view,
        name="login"
    ),

    path(
        "logout/",
        logout_view,
        name="logout"
    ),
]