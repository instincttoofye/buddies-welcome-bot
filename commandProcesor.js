const processCommand = async (message, input) => {
    console.log("at processCommand");
    
    if (input === "glyphs") {
        let destination = input.slice(7);
        if (destination.isEmpty) return;
        
        if (destination === "alliance") {
            await message.channel.send(":Glyph2::Glyph1::Glyph1::Glyph5::Glyph1::Glyph1::Glyph15::Glyph16::Glyph2::Glyph10::Glyph5::Glyph3:")
        }
    } else {
        return;
    }
}

export default processCommand;