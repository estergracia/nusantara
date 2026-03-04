
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oxlykyiwthyhgkhhhhnr.supabase.co";
const supabaseKey = "sb_publishable_XbbXkavmicrNoQmGVl5kvQ_yEiuqthP";

export const supabase = createClient(supabaseUrl, supabaseKey);
        