-- Fix search_path security issue by recreating function and trigger
DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_messages;
DROP FUNCTION IF EXISTS update_conversation_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();