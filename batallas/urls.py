from django.urls import path
from . import views
urlpatterns=[
 path('',views.inicio,name='inicio'),
 path('competidores/',views.competidores,name='competidores'),
 path('nueva-batalla/',views.nueva_batalla,name='nueva_batalla'),
 path('batalla/<int:batalla_id>/',views.detalle_batalla,name='detalle_batalla'),
 path('batalla/<int:batalla_id>/guardar/',views.guardar_fase,name='guardar_fase'),
 path('batalla/<int:batalla_id>/resumen/',views.resumen_batalla,name='resumen_batalla'),
 path('batalla/<int:batalla_id>/finalizar/',views.finalizar_batalla,name='finalizar_batalla'),
 path('liga/<int:liga_id>/tabla/',views.tabla_general,name='tabla_general'),
]
