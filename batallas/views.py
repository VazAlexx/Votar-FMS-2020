import json
from django.shortcuts import render,redirect,get_object_or_404
from django.http import JsonResponse,HttpResponseBadRequest
from django.db import transaction
from django.contrib import messages
from .models import Liga,Competidor,Batalla,VotoPatron

LIGAS=[('FMS Argentina','argentina'),('FMS Chile','chile'),('FMS Colombia','colombia'),('FMS España','espana'),('FMS México','mexico'),('FMS Perú','peru')]

def asegurar_ligas():
    for n,s in LIGAS: Liga.objects.get_or_create(nombre=n,slug=s)

def inicio(request):
    asegurar_ligas()
    return render(request,'batallas/inicio.html',{'ligas':Liga.objects.all(),'batallas':Batalla.objects.select_related('liga','mc_a','mc_b')[:8]})

def competidores(request):
    asegurar_ligas()
    if request.method=='POST':
        nombre=request.POST.get('nombre','').strip(); liga_id=request.POST.get('liga')
        if nombre and liga_id:
            liga=get_object_or_404(Liga,id=liga_id)
            Competidor.objects.get_or_create(nombre=nombre,liga=liga)
            messages.success(request,'MC registrado correctamente.')
            return redirect('competidores')
    return render(request,'batallas/competidores.html',{'ligas':Liga.objects.all(),'competidores':Competidor.objects.select_related('liga')})

def nueva_batalla(request):
    asegurar_ligas()
    if request.method=='POST':
        liga=get_object_or_404(Liga,id=request.POST.get('liga'))
        a=get_object_or_404(Competidor,id=request.POST.get('mc_a'),liga=liga)
        b=get_object_or_404(Competidor,id=request.POST.get('mc_b'),liga=liga)
        if a==b:
            messages.error(request,'Seleccioná dos MC diferentes.'); return redirect('nueva_batalla')
        batalla=Batalla.objects.create(liga=liga,mc_a=a,mc_b=b,evento=request.POST.get('evento',''),fecha=request.POST.get('fecha') or None)
        return redirect('detalle_batalla',batalla.id)
    return render(request,'batallas/nueva_batalla.html',{'ligas':Liga.objects.all(),'competidores':Competidor.objects.select_related('liga')})

def detalle_batalla(request,batalla_id):
    b=get_object_or_404(Batalla.objects.select_related('mc_a','mc_b','liga'),id=batalla_id)
    if request.GET.get('replica')=='1' and not b.es_replica:
        b.es_replica=True
        b.save(update_fields=['es_replica'])
    return render(request,'batallas/detalle.html',{'batalla':b})

def _payload(request):
    try:return json.loads(request.body.decode())
    except:return None

def guardar_fase(request,batalla_id):
    if request.method!='POST': return HttpResponseBadRequest('POST requerido')
    b=get_object_or_404(Batalla,id=batalla_id); data=_payload(request)
    if not data:return HttpResponseBadRequest('JSON inválido')
    fase=data.get('fase'); votos=data.get('votos',{})
    if not fase:return HttpResponseBadRequest('Fase requerida')
    for mc in (b.mc_a,b.mc_b):
        x=votos.get(str(mc.id),{})
        VotoPatron.objects.update_or_create(batalla=b,fase=fase,mc=mc,defaults={'puntajes':x.get('puntajes',[]),'skills':float(x.get('skills',0) or 0),'flow':float(x.get('flow',0) or 0),'puesta':float(x.get('puesta',0) or 0),'respuestas':int(x.get('respuestas',0) or 0)})
    return JsonResponse({'ok':True})

def _totales(b):
    ta=tb=0
    for v in b.votos.all():
        if v.mc_id==b.mc_a_id: ta+=v.total
        elif v.mc_id==b.mc_b_id: tb+=v.total
    return round(ta,2),round(tb,2)

def resumen_batalla(request,batalla_id):
    b=get_object_or_404(Batalla.objects.select_related('mc_a','mc_b','liga').prefetch_related('votos__mc'),id=batalla_id)
    ta,tb=_totales(b)
    b.total_a=ta; b.total_b=tb; b.save(update_fields=['total_a','total_b'])
    diferencia=abs(ta-tb)
    orden=['easy','hard','tematica_1','tematica_2','random','minuto_ida','minuto_vuelta','deluxe','replica']
    nombres={
        'easy':'Easy Mode','hard':'Hard Mode','tematica_1':'Temática 1','tematica_2':'Temática 2',
        'random':'Random Mode','minuto_ida':'Minuto de ida','minuto_vuelta':'Minuto de vuelta',
        'deluxe':'Deluxe','replica':'Réplica'
    }
    votos={(v.fase,v.mc_id):v for v in b.votos.all()}
    resumen=[]
    for fase in orden:
        va=votos.get((fase,b.mc_a_id)); vb=votos.get((fase,b.mc_b_id))
        if va or vb:
            resumen.append({'nombre':nombres[fase],'a':round(va.total if va else 0,2),'b':round(vb.total if vb else 0,2)})
    return render(request,'batallas/resumen.html',{
        'batalla':b,'total_a':ta,'total_b':tb,'diferencia':diferencia,
        'replica_necesaria':(not b.es_replica and diferencia<=5),'resumen_rounds':resumen
    })

@transaction.atomic
def finalizar_batalla(request,batalla_id):
    b=get_object_or_404(Batalla.objects.select_related('mc_a','mc_b'),id=batalla_id)
    if request.method=='POST' and request.POST.get('guardar')=='si':
        ta,tb=_totales(b); b.total_a=ta;b.total_b=tb;b.finalizada=True;b.guardada=True
        if ta>tb: ganador,perdedor=b.mc_a,b.mc_b
        elif tb>ta: ganador,perdedor=b.mc_b,b.mc_a
        else: ganador=perdedor=None
        if ganador:
            ganador.batallas+=1; perdedor.batallas+=1
            ganador.puntos_favor += ta if ganador==b.mc_a else tb
            perdedor.puntos_favor += tb if ganador==b.mc_a else ta
            if b.es_replica: ganador.puntos+=2; perdedor.puntos+=1
            else: ganador.puntos+=3
            ganador.save(); perdedor.save(); b.ganador=ganador
        b.save()
        messages.success(request,'Registro de batalla guardado correctamente.')
        return redirect('inicio')
    if request.method=='POST':
        b.finalizada=True;b.guardada=False;b.save(update_fields=['finalizada','guardada'])
        messages.info(request,'La batalla se cerró sin guardar el registro.')
        return redirect('inicio')
    return redirect('resumen_batalla',batalla_id=b.id)

def tabla_general(request,liga_id):
    liga=get_object_or_404(Liga,id=liga_id)
    tabla=Competidor.objects.filter(liga=liga).order_by('-puntos','-puntos_favor','nombre')
    return render(request,'batallas/tabla.html',{'liga':liga,'tabla':tabla,'ligas':Liga.objects.all()})
