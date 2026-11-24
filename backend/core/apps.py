from django.apps import AppConfig
from django.db.models.signals import pre_save


class CoreConfig(AppConfig):
    name = "core"
    verbose_name = "Settings"

    def ready(self):
        from . import revalidate
        from .images import shrink_new_images

        pre_save.connect(shrink_new_images, dispatch_uid="shrink_new_images")
        revalidate.connect()
