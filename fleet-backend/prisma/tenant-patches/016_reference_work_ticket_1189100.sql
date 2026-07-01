-- Reference work ticket 1189100 (G4S paper form sample — KDE 073Q / Embakasi)
DO $$
DECLARE
  tid UUID;
  legs_data JSONB := '[
    {"id":"leg-1189100-1","details":"Base - Total - EDAS","openingMileage":186250,"timeOut":"0938","officerAuthorising":"J.M.","fuelDrawn":"","timeIn":"1017","closingMileage":186253,"serviceDone":"","officerConfirming":"J.M.","journeyType":"S/S"},
    {"id":"leg-1189100-2","details":"Nyati HQ - Base","openingMileage":186292,"timeOut":"1215","officerAuthorising":"","fuelDrawn":"","timeIn":"1838","closingMileage":186330,"serviceDone":"","officerConfirming":"","journeyType":"S/S"},
    {"id":"leg-1189100-3","details":"Base - CBD","openingMileage":186330,"timeOut":"1738","officerAuthorising":"","fuelDrawn":"","timeIn":"1942","closingMileage":186341,"serviceDone":"","officerConfirming":"","journeyType":"S/S"}
  ]'::jsonb;
  cond_data JSONB := '{"petrolDiesel":"Empty","oil":"OK","seatBelt":"OK","water":"OK","battery":"OK","tyres":"OK","safety":"OK","triangles":"OK","body":"OK","spareWheel":"OK","fireExtinguisher":"OK","tools":"OK"}'::jsonb;
BEGIN
  SELECT id INTO tid FROM work_tickets WHERE serial_no = '1189100' LIMIT 1;

  IF tid IS NULL THEN
    INSERT INTO work_tickets (
      serial_no, branch, trip_date, plate, make, vehicle_type, driver_name, route,
      rate_type, agreed_rate, legs, vehicle_condition, private_km, official_km,
      net, vat, total, driver_signature, certification_date, status
    ) VALUES (
      '1189100', 'Embakasi', '2024-04-27', 'KDE 073Q', 'Isuzu', 'FRR 90', 'Kennedy Priti 817',
      'Nairobi local', 'fixed', 8500, legs_data, cond_data, 0, 91,
      8500, 1360, 9860, 'Kennedy Priti', '2024-04-27', 'draft'
    );
  ELSE
    UPDATE work_tickets SET
      branch = 'Embakasi',
      trip_date = '2024-04-27',
      plate = 'KDE 073Q',
      make = 'Isuzu',
      vehicle_type = 'FRR 90',
      driver_name = 'Kennedy Priti 817',
      route = 'Nairobi local',
      rate_type = 'fixed',
      agreed_rate = 8500,
      legs = legs_data,
      vehicle_condition = cond_data,
      private_km = 0,
      official_km = 91,
      net = 8500,
      vat = 1360,
      total = 9860,
      driver_signature = 'Kennedy Priti',
      certification_date = '2024-04-27',
      updated_at = NOW()
    WHERE id = tid;
  END IF;
END $$;
