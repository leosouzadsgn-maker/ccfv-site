-- Depois de salvar o Léo com Champions + Barcelona:
select
    p.name as treinador,
    p.platform,
    cr.status as inscricao,
    cc.name as clube,
    c.status as status_clube
from public.players p
left join public.championship_registrations cr
    on cr.participant_id=p.id
   and cr.championship_id='362284ef-e410-45b8-890b-630f1130f9d2'
left join public.championship_clubs c
    on c.id=cr.selected_club_id
left join public.champions_clubs cc
    on cc.id=c.club_id
where lower(p.name)=lower('Léo Souza');

-- Conferência da view pública:
select
    name,
    participant_name,
    status
from public.championship_public_clubs
where lower(name)=lower('Barcelona');
