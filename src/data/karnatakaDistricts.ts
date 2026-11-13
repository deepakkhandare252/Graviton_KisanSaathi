export interface DistrictInfo {
  id: string;
  nameEn: string;
  nameKn: string;
  region: 'Old Mysuru' | 'Kalyana Karnataka' | 'Kittur Karnataka' | 'Coastal' | 'Central';
}

export const KARNATAKA_DISTRICTS: DistrictInfo[] = [
  { id: 'bagalkot', nameEn: 'Bagalkot', nameKn: 'ಬಾಗಲಕೋಟೆ', region: 'Kittur Karnataka' },
  { id: 'ballari', nameEn: 'Ballari (Bellary)', nameKn: 'ಬಳ್ಳಾರಿ', region: 'Kalyana Karnataka' },
  { id: 'belagavi', nameEn: 'Belagavi (Belgaum)', nameKn: 'ಬೆಳಗಾವಿ', region: 'Kittur Karnataka' },
  { id: 'bengaluru_rural', nameEn: 'Bengaluru Rural', nameKn: 'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ', region: 'Old Mysuru' },
  { id: 'bengaluru_urban', nameEn: 'Bengaluru Urban', nameKn: 'ಬೆಂಗಳೂರು ನಗರ', region: 'Old Mysuru' },
  { id: 'bidar', nameEn: 'Bidar', nameKn: 'ಬೀದರ್', region: 'Kalyana Karnataka' },
  { id: 'chamarajanagar', nameEn: 'Chamarajanagar', nameKn: 'ಚಾಮರಾಜನಗರ', region: 'Old Mysuru' },
  { id: 'chikkaballapura', nameEn: 'Chikkaballapura', nameKn: 'ಚಿಕ್ಕಬಳ್ಳಾಪುರ', region: 'Old Mysuru' },
  { id: 'chikkamagaluru', nameEn: 'Chikkamagaluru', nameKn: 'ಚಿಕ್ಕಮಗಳೂರು', region: 'Central' },
  { id: 'chitradurga', nameEn: 'Chitradurga', nameKn: 'ಚಿತ್ರದುರ್ಗ', region: 'Central' },
  { id: 'dakshina_kannada', nameEn: 'Dakshina Kannada (Mangaluru)', nameKn: 'ದಕ್ಷಿಣ ಕನ್ನಡ', region: 'Coastal' },
  { id: 'davanagere', nameEn: 'Davanagere', nameKn: 'ದಾವಣಗೆರೆ', region: 'Central' },
  { id: 'dharwad', nameEn: 'Dharwad', nameKn: 'ಧಾರವಾಡ', region: 'Kittur Karnataka' },
  { id: 'gadag', nameEn: 'Gadag', nameKn: 'ಗದಗ', region: 'Kittur Karnataka' },
  { id: 'hassan', nameEn: 'Hassan', nameKn: 'ಹಾಸನ', region: 'Old Mysuru' },
  { id: 'haveri', nameEn: 'Haveri', nameKn: 'ಹಾವೇರಿ', region: 'Kittur Karnataka' },
  { id: 'kalaburagi', nameEn: 'Kalaburagi (Gulbarga)', nameKn: 'ಕಲಬುರಗಿ', region: 'Kalyana Karnataka' },
  { id: 'kodagu', nameEn: 'Kodagu (Coorg)', nameKn: 'ಕೊಡಗು', region: 'Old Mysuru' },
  { id: 'kolar', nameEn: 'Kolar', nameKn: 'ಕೋಲಾರ', region: 'Old Mysuru' },
  { id: 'koppal', nameEn: 'Koppal', nameKn: 'ಕೊಪ್ಪಳ', region: 'Kalyana Karnataka' },
  { id: 'mandya', nameEn: 'Mandya', nameKn: 'ಮಂಡ್ಯ', region: 'Old Mysuru' },
  { id: 'mysuru', nameEn: 'Mysuru (Mysore)', nameKn: 'ಮೈಸೂರು', region: 'Old Mysuru' },
  { id: 'raichur', nameEn: 'Raichur', nameKn: 'ರಾಯಚೂರು', region: 'Kalyana Karnataka' },
  { id: 'ramanagara', nameEn: 'Ramanagara', nameKn: 'ರಾಮನಗರ', region: 'Old Mysuru' },
  { id: 'shivamogga', nameEn: 'Shivamogga (Shimoga)', nameKn: 'ಶಿವಮೊಗ್ಗ', region: 'Central' },
  { id: 'tumakuru', nameEn: 'Tumakuru (Tumkur)', nameKn: 'ತುಮಕೂರು', region: 'Old Mysuru' },
  { id: 'udupi', nameEn: 'Udupi', nameKn: 'ಉಡುಪಿ', region: 'Coastal' },
  { id: 'uttara_kannada', nameEn: 'Uttara Kannada (Karwar)', nameKn: 'ಉತ್ತರ ಕನ್ನಡ', region: 'Coastal' },
  { id: 'vijayanagara', nameEn: 'Vijayanagara (Hospet)', nameKn: 'ವಿಜಯನಗರ', region: 'Kalyana Karnataka' },
  { id: 'vijayapura', nameEn: 'Vijayapura (Bijapur)', nameKn: 'ವಿಜಯಪುರ', region: 'Kittur Karnataka' },
  { id: 'yadgir', nameEn: 'Yadgir', nameKn: 'ಯಾದಗಿರಿ', region: 'Kalyana Karnataka' }
];
