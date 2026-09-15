select count(*) as total
from public.championship_public_clubs_options;

select championship_club_id,name,slug,sort_order,status,participant_id,participant_name
from public.championship_public_clubs_options
order by sort_order;
