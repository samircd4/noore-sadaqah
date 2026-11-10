from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models import Q

from core.models import TimeStamped


class UserManager(BaseUserManager):
    """Users have an email or a phone (or both); no username (DATA_MODEL.md "accounts")."""

    use_in_migrations = True

    def create_user(self, email=None, phone=None, password=None, **extra):
        if not email and not phone:
            raise ValueError("A user needs an email or a phone number.")
        user = self.model(email=self.normalize_email(email).lower() if email else None, phone=phone or None, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # donors log in with an OTP (B3)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email=email, password=password, **extra)


class User(AbstractUser, TimeStamped):
    """Donors and staff. Donors log in with an OTP to phone or email (B3); staff use email + password in /admin/."""

    username = None
    first_name = None
    last_name = None
    email = models.EmailField(unique=True, null=True, blank=True)  # stored lower-case
    phone = models.CharField(max_length=11, unique=True, null=True, blank=True)  # normalised 01XXXXXXXXX
    name = models.CharField(max_length=120, blank=True)
    preferred_locale = models.CharField(max_length=2, default="bn")
    failed_logins = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(email__isnull=False) | Q(phone__isnull=False), name="user_has_email_or_phone"
            )
        ]

    def __str__(self):
        return self.email or self.phone or str(self.pk)
