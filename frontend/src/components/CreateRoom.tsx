import { useState } from 'react';
import { socket } from '../socket.ts';
import { useSocketStore } from '../store/socketStore.ts';

const ROOM_NAME_WORDS = [
  'shadow', 'whisper', 'hollow', 'thicket', 'lantern', 'acorn', 'willow',
  'comet', 'meadow', 'ripple', 'ember', 'breeze', 'pebble', 'harbor',
  'cinder', 'raven', 'otter', 'juniper', 'marble', 'thistle', 'hush',
  'glimmer', 'dusk', 'nook', 'burrow', 'fox', 'badger', 'sparrow',
  'sly', 'nimble', 'quiet', 'swift', 'clever', 'sneaky', 'playful',
  'brave', 'silent', 'curious', 'gentle', 'lucky',
];

export default function CreateRoom () {
  const [ roomName, setRoomName ] = useState('');
  const clearJoinError = useSocketStore((s) => s.clearJoinError);

  const createRoom = () => {
    console.log('Room name to be created:', roomName);
    socket.emit('joinRoom', { roomName });
  };

  const generateRandomRoomName = () =>{
    const a = ROOM_NAME_WORDS[Math.floor(Math.random() * ROOM_NAME_WORDS.length)];
    const b = ROOM_NAME_WORDS[Math.floor(Math.random() * ROOM_NAME_WORDS.length)];
    return `${a}-${b}`;
  }

  const createRandomRoom = () => {
    const name = generateRandomRoomName();
    setRoomName(name);
    console.log('Room name to be created:', name);
    socket.emit('joinRoom', { roomName: name });
  };

  return (
    <div>
      <div>
        <label htmlFor='room-name'>Name a Room</label>
        <input type='text' value={roomName}
               onChange={( e ) => {
                 setRoomName(e.target.value);
                 clearJoinError();
               }}/>
      </div>
      <div>
        <button onClick={createRoom}>Create</button>
        <button onClick={createRandomRoom}>🎲 Random Room</button>
      </div>
    </div>
  );
}
