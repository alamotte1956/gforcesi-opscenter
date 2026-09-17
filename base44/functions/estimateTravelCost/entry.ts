import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { origin_city, destination_city, depart_date, return_date, crew_count } = body;
    if (!origin_city || !destination_city) {
      return Response.json({ error: 'origin_city and destination_city are required' }, { status: 400 });
    }
    const prompt = `You are a corporate travel cost estimator for field crews traveling to 3D scanning job sites.
Estimate realistic TYPICAL costs (USD) for a business trip with the following details:
- Origin city: ${origin_city}
- Destination city: ${destination_city}
- Departure date: ${depart_date || 'flexible'}
- Return date: ${return_date || 'flexible'}
- Crew size: ${crew_count || 1}

Base your estimates on seasonal airfare patterns and the destination's general cost level. Provide:
- Round-trip economy airfare per person: a low, typical, and high estimate
- Mid-range hotel per night: a low, typical, and high estimate
- Per-diem (meals + incidentals) per person per day: a single typical estimate
- A short note explaining the assumptions (season, route type, cost level of destination)

Return only the JSON object.`;
    const estimate = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          flight_low: { type: 'number' },
          flight_typical: { type: 'number' },
          flight_high: { type: 'number' },
          lodging_per_night_low: { type: 'number' },
          lodging_per_night_typical: { type: 'number' },
          lodging_per_night_high: { type: 'number' },
          per_diem_per_day: { type: 'number' },
          notes: { type: 'string' }
        },
        required: ['flight_typical', 'lodging_per_night_typical', 'per_diem_per_day']
      }
    });
    return Response.json({ estimate });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}