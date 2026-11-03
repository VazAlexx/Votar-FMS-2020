from django.db import models
from django.core.validators import MinValueValidator

class Liga(models.Model):
    nombre=models.CharField(max_length=40,unique=True)
    slug=models.SlugField(unique=True)
    class Meta: ordering=['nombre']
    def __str__(self): return self.nombre

class Competidor(models.Model):
    nombre=models.CharField(max_length=80)
    liga=models.ForeignKey(Liga,on_delete=models.CASCADE,related_name='competidores')
    puntos=models.IntegerField(default=0)
    batallas=models.IntegerField(default=0)
    puntos_favor=models.FloatField(default=0)
    class Meta: unique_together=[('nombre','liga')]; ordering=['nombre']
    def __str__(self): return self.nombre

class Batalla(models.Model):
    liga=models.ForeignKey(Liga,on_delete=models.PROTECT,related_name='batallas')
    mc_a=models.ForeignKey(Competidor,on_delete=models.PROTECT,related_name='batallas_a')
    mc_b=models.ForeignKey(Competidor,on_delete=models.PROTECT,related_name='batallas_b')
    evento=models.CharField(max_length=120,blank=True)
    fecha=models.DateField(null=True,blank=True)
    finalizada=models.BooleanField(default=False)
    guardada=models.BooleanField(default=False)
    es_replica=models.BooleanField(default=False)
    ganador=models.ForeignKey(Competidor,null=True,blank=True,on_delete=models.SET_NULL,related_name='victorias')
    total_a=models.FloatField(default=0); total_b=models.FloatField(default=0)
    creada=models.DateTimeField(auto_now_add=True)
    class Meta: ordering=['-creada']
    def __str__(self): return f'{self.mc_a} vs {self.mc_b}'

class VotoPatron(models.Model):
    batalla=models.ForeignKey(Batalla,on_delete=models.CASCADE,related_name='votos')
    fase=models.CharField(max_length=40)
    mc=models.ForeignKey(Competidor,on_delete=models.CASCADE)
    puntajes=models.JSONField(default=list)
    skills=models.FloatField(default=0); flow=models.FloatField(default=0); puesta=models.FloatField(default=0)
    respuestas=models.IntegerField(default=0)
    class Meta: unique_together=[('batalla','fase','mc')]
    @property
    def total(self): return sum(float(x or 0) for x in self.puntajes)+self.skills+self.flow+self.puesta+(self.respuestas*0.5)
