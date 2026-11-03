from django.contrib import admin
from .models import Liga,Competidor,Batalla,VotoPatron
admin.site.register(Liga)
admin.site.register(Competidor)
@admin.register(Batalla)
class BatallaAdmin(admin.ModelAdmin):
    list_display=('mc_a','mc_b','liga','finalizada','guardada','total_a','total_b')
admin.site.register(VotoPatron)
