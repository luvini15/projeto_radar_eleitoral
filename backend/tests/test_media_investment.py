import json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from app.services.media_investment import contextual_ratios,media_context,local_records

class MediaCalculationTests(unittest.TestCase):
 def test_user_supplied_values_and_rounding(self):
  celina=contextual_ratios(81000,198988,11121);grass=contextual_ratios(153000,101586,14973)
  self.assertEqual(round(celina['spend_per_observed_interaction'],2),0.41)
  self.assertEqual(round(grass['spend_per_observed_interaction'],2),1.51)
  self.assertEqual(round(celina['interactions_per_1000_brl']),2457)
  self.assertEqual(round(grass['interactions_per_1000_brl']),664)
  self.assertEqual(round(celina['spend_per_additional_follower'],2),7.28)
  self.assertEqual(round(grass['spend_per_additional_follower'],2),10.22)
 def test_missing_zero_negative_and_nonfinite_denominators(self):
  for amount,interactions,growth in [(None,100,10),(100,None,None),(100,0,0),(100,-1,-1),(100,float('nan'),float('inf'))]:
   result=contextual_ratios(amount,interactions,growth)
   self.assertIsNone(result['spend_per_observed_interaction']);self.assertIsNone(result['spend_per_additional_follower'])
  zero=contextual_ratios(0,100,10)
  self.assertEqual(zero['spend_per_observed_interaction'],0);self.assertIsNone(zero['interactions_per_1000_brl'])
 def test_config_validates_duplicates_amounts_and_missing_file(self):
  with tempfile.TemporaryDirectory() as folder:
   file=Path(folder)/'meta.json'
   with patch.dict(os.environ,{'META_MEDIA_INVESTMENT_FILE':str(file)}):
    self.assertEqual(local_records(),[])
    record={'campaign_id':1,'slate_id':1,'profile_ids':[1,4],'currency':'BRL','window_days':90,'amount':81000}
    file.write_text(json.dumps({'records':[record]}));self.assertEqual(local_records()[0]['amount'],81000)
    for records in [[record,record],[{**record,'amount':-1}],[{**record,'currency':'USD'}]]:
     file.write_text(json.dumps({'records':records}));self.assertEqual(local_records(),[])
