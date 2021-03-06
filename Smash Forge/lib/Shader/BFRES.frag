#version 330

//------------------------------------------------------------------------------------
//
//      Viewport Camera/Lighting
//
//------------------------------------------------------------------------------------

uniform mat4 modelview;
uniform vec3 specLightDirection;
uniform vec3 difLightDirection;

uniform int enableCellShading;

const float levels = 3.0;

//------------------------------------------------------------------------------------
//
//      Verex Attributes
//
//------------------------------------------------------------------------------------

in vec2 f_texcoord0;
in vec2 f_texcoord1;
in vec2 f_texcoord2;
in vec2 f_texcoord3;
in vec3 normal;
in vec4 color;
in vec3 tangent;
in vec3 bitangent;

in vec3 boneWeightsColored;

//------------------------------------------------------------------------------------
//
//      Viewport Settings
//
//------------------------------------------------------------------------------------

uniform int uvChannel;
uniform int renderType;
uniform int useNormalMap;
uniform vec4 colorSamplerUV;
uniform int renderVertColor;
uniform vec3 difLightColor;
uniform vec3 ambLightColor;
uniform int colorOverride;

// Channel Toggles
uniform int renderR;
uniform int renderG;
uniform int renderB;
uniform int renderAlpha;

//------------------------------------------------------------------------------------
//
//      Texture Samplers
//
//------------------------------------------------------------------------------------

uniform sampler2D tex0;
uniform sampler2D BakeShadowMap;
uniform sampler2D spl;
uniform sampler2D nrm;
uniform sampler2D BakeLightMap;
uniform sampler2D UVTestPattern;
uniform sampler2D TransparencyMap;
uniform sampler2D EmissionMap;
uniform sampler2D SpecularMap;
uniform sampler2D DiffuseLayer;

//------------------------------------------------------------------------------------
//
//      Shader Params
//
//------------------------------------------------------------------------------------

uniform float normal_map_weight;
uniform float ao_density;
uniform float emission_intensity;
uniform vec4 fresnelParams;
uniform vec4 base_color_mul_color;
uniform vec3 emission_color;


//------------------------------------------------------------------------------------
//
//      Shader Options
//
//------------------------------------------------------------------------------------

uniform float uking_texture2_texcoord;
uniform float bake_shadow_type;
uniform float enable_fresnel;
uniform float enable_emission;


//------------------------------------------------------------------------------------
//
//      Texture Map Toggles
//
//------------------------------------------------------------------------------------

uniform int HasNormalMap;
uniform int HasSpecularMap;
uniform int HasShadowMap;
uniform int HasAmbientOcclusionMap;
uniform int HasLightMap;
uniform int HasTransparencyMap;
uniform int HasEmissionMap;
uniform int HasDiffuseLayer;
uniform int isTransparent;



out vec4 FragColor;

#define gamma 2.2


vec2 displayTexCoord =  f_texcoord0;

float AmbientOcclusionBlend()
{
    float aoMap = pow(texture(BakeShadowMap, f_texcoord2).g, gamma);

    float aoDensity = ao_density;

    return mix(aoMap, 1, aoDensity);
}


vec3 CalcSpecularMap(vec3 I, vec3 NormalMap)
{
    if (HasSpecularMap == 0)
	    return vec3(1);

   float shininess = 32.0;

   if (HasSpecularMap == 1)
       shininess = texture2D(SpecularMap, f_texcoord0).r * 255.0;

   vec3 NewSpecular = vec3(1);

   if (shininess < 255.0)
   {   
   }



    return NewSpecular;

}

vec3 CalcBumpedNormal(vec3 inputNormal) //Currently reused some bits from nud shader. 
{
    // if no normal map, then return just the normal
    if(useNormalMap == 0 || HasNormalMap == 0)
	   return inputNormal;

    float normalIntensity = 3;

	//if (normal_map_weight != 0) //MK8 and splatoon 1/2 uses this param
	//      normalIntensity = normal_map_weight;

	vec3 BumpMapNormal = vec3(1);
	if (uking_texture2_texcoord == 1)
        BumpMapNormal = vec3(texture(nrm, f_texcoord1).rg, 1);
    else
        BumpMapNormal = vec3(texture(nrm, displayTexCoord).rg, 1);
    BumpMapNormal = mix(vec3(0.5, 0.5, 1), BumpMapNormal, normalIntensity); // probably a better way to do this
    BumpMapNormal = 2.0 * BumpMapNormal - vec3(1);

	vec3 B = vec3(0);
	vec3 T = vec3(0);

    vec3 NewNormal;
    vec3 Normal = normalize(normal);
	if (bitangent != vec3(0))
	    B = normalize(bitangent);
	if (tangent != vec3(0))
	    T = normalize(tangent);
    mat3 TBN = mat3(tangent, B, Normal);
    NewNormal = TBN * BumpMapNormal;
    NewNormal = normalize(NewNormal);

    return NewNormal;
}

void main()
{
    if (uvChannel == 2)
        displayTexCoord = f_texcoord1;
    if (uvChannel == 3)
        displayTexCoord = f_texcoord3;

    if (colorOverride == 1)
    {
        // Wireframe color.

		if (renderVertColor == 1)
		{
            FragColor = vec4(color);
		}
		else
		{
            FragColor = vec4(1);
		}
        return;
    }
 

  //Diffuse
    vec3 colordiff = texture(tex0, displayTexCoord).rgb;
    vec3 ambient = 0.15 * colordiff;
    vec3 lightColor = vec3(1.0);
    float diff = max(dot(difLightColor, normal), 0.0);
    vec3 diffuse = diff * lightColor;


  //Normal Map
	vec3 bumpMapNormal = CalcBumpedNormal(normal);
    float halfLambert = dot(difLightDirection, bumpMapNormal) * 0.5 + 0.5;
    halfLambert = (halfLambert + 1) / 2;

    vec3 I = vec3(0,0,-1) * mat3(modelview);

    float normalBnW = dot(vec4(bumpMapNormal * mat3(modelview), 1.0), vec4(0.25,0.25,0.25,1.0));

  //Specular Maps
    float specularIntensity = texture2D(SpecularMap, f_texcoord0).r;
	vec3 specularMap = CalcSpecularMap(I, normal);

  //Light Map

    vec4 LightMapColor = texture(BakeLightMap, f_texcoord2);

  //Ambient Occusion Map
    float AmbientBlend = AmbientOcclusionBlend();
	float ao_intensity = LightMapColor.a;

  //Shadow Map
    vec3 ShadowDepth = texture(BakeShadowMap, f_texcoord1).ggg;
	float shadow_intensity = LightMapColor.a;

  //Light Setup
    vec3 lighting = mix(ambLightColor, difLightColor, halfLambert); // gradient based lighting
    vec4 ambiant = vec4(0.8,0.8,0.8,1.0) * texture(tex0, displayTexCoord).rgba;
    vec4 alpha = texture2D(tex0, displayTexCoord).aaaa;

	vec3 trans = vec3(0);

	if (HasTransparencyMap == 1)
	{
	    alpha = texture2D(TransparencyMap, displayTexCoord).rgba;
		alpha = alpha.rgba * vec4(0.5);
	}

	//Cell Shade
	float nDot1 = dot(bumpMapNormal, difLightDirection);

	float brightness = 0;

	if (enableCellShading == 1)
	{
	    brightness = max(nDot1, 0.0);
		float level = floor(brightness * levels);
		brightness = level / levels;
		brightness = brightness;
	}
	else
	{
        float normals = dot(vec4(bumpMapNormal * mat3(modelview), 1.0), vec4(0.25,0.25,0.25,1.0));

		float halfLambert = dot(difLightDirection, bumpMapNormal) * 0.5 + 0.5;
		halfLambert = (halfLambert + 1) / 2;

		brightness = normals;
	}


	vec4 outputColor =  (vec4(texture(tex0, displayTexCoord).rgb, 1) * vec4(0.85,0.85,0.85,1.0) * brightness);


//----------------------------------------------------------------------
//
// Diffuse Layer
//
//----------------------------------------------------------------------

    //Texture Overlay (Like an emblem in mk8)
	if (HasDiffuseLayer == 1)
	{
	      FragColor += vec4(texture(DiffuseLayer, f_texcoord3).rgb, 1) * vec4(1);
	  //   outputColor = outputColor + vec4(texture(DiffuseLayer, f_texcoord3).rgb, 1) * vec4(1);
	}
	


  //Default Shader
    FragColor =  ambiant + vec4(((0.9,0.9,0.9 * alpha * outputColor)).xyz, alpha.x * halfLambert);

//----------------------------------------------------------------------
//
// Emission
//
//----------------------------------------------------------------------

	float EmissionIntensity = emission_intensity * emission_intensity;

	if (emission_intensity > 0.1)
	{
	    vec3 emission = vec3(EmissionIntensity);
	    FragColor.rgb += emission.rgb;
	}

    if (HasEmissionMap == 1 || enable_emission == 1)
	{
	     vec3 emission = vec3(1);

    //BOTW somtimes uses second uv channel for emission map
	if (uking_texture2_texcoord == 1)
	    emission = texture2D(EmissionMap, f_texcoord1).rgb * vec3(1);
    else
	    emission = texture2D(EmissionMap, displayTexCoord).rgb * emission_color;

		if (emission.rgb == vec3(0)) //If tex is empty then use full brightness. Some emissive mats have emission but no texture
		{
     	    FragColor.rgb += vec3(emission_intensity) * emission_color;
		}
		else
		{
     	    FragColor.rgb += emission.rgb;
		}
	}

//----------------------------------------------------------------------
//
// Shadows and AO
//
//----------------------------------------------------------------------

    if (HasAmbientOcclusionMap == 1)
    {
         vec4 A0Tex = vec4(1);

         if (uking_texture2_texcoord == 1)
               A0Tex = vec4(texture(BakeShadowMap, f_texcoord1).rrr, 1);
		 else
		      A0Tex = vec4(texture(BakeShadowMap, displayTexCoord).rrr, 1);

	  //   FragColor *= A0Tex;    
    }
	if (HasShadowMap == 1)
	{
	     if (bake_shadow_type == 0)
		 {
		       vec4 A0Tex = vec4(texture(BakeShadowMap, f_texcoord1).rrr, 1);
		       FragColor *= A0Tex;
		 }
         if (bake_shadow_type == 2)
		 {
		       vec4 A0Tex = vec4(texture(BakeShadowMap, f_texcoord1).rrr, 1);
		       FragColor *= A0Tex;

			   //For this it will need a frame buffer to be used
			   vec4 ShadowTex = vec4(texture(BakeShadowMap, f_texcoord1).ggg, 1);
		 }
	}

//----------------------------------------------------------------------
//
// Diffuse Colors
//
//----------------------------------------------------------------------

   //Mario Odyssey uses this. Often for fur colors
   if (base_color_mul_color != vec4(0))
       FragColor *= min(base_color_mul_color, 1);


//----------------------------------------------------------------------
//
//      Debug Shading
//
//----------------------------------------------------------------------

    vec3 displayNormal = (bumpMapNormal * 0.5) + 0.5;

    vec3 displayTangent = (tangent * 0.5) + 0.5;
    if (dot(tangent, vec3(1)) == 0)
        displayTangent = vec3(0);

    vec3 displayBitangent = (bitangent * 0.5) + 0.5;
    if (dot(bitangent, vec3(1)) == 0)
        displayBitangent = vec3(0);

    if (renderVertColor == 1)
	    FragColor *= min(color, vec4(1));

    if (renderType == 1) // normals vertexColor
        FragColor = vec4(displayNormal,1);


    else if (renderType == 2) // Currently loads shadows from bake map. May change to it's own tab or something
    {
        float normalBnW = dot(vec4(bumpMapNormal * mat3(modelview), 1.0), vec4(0.15,0.15,0.15,1.0));
     //   FragColor.rgb = vec3(normalBnW);
          FragColor =  vec4(texture(BakeShadowMap, f_texcoord1).ggg, 1);
    }
	else if (renderType == 4) //Display Normal
	{
		if (uking_texture2_texcoord == 1)
            FragColor.rgb = texture(nrm, f_texcoord1).rgb;
		else
            FragColor.rgb = texture(nrm, displayTexCoord).rgb;
	}
	else if (renderType == 3) //DiffuseColor
	    FragColor = vec4(texture(tex0, displayTexCoord).rgb, 1);
    else if (renderType == 5) // vertexColor
        FragColor = color;
	else if (renderType == 6) //Display Ambient Occlusion
	{
	    if (HasShadowMap == 1)
            FragColor =  vec4(texture(BakeShadowMap, f_texcoord1).rrr, 1);
		else
            FragColor = vec4(1);
	}
    else if (renderType == 7) // uv coords
        FragColor = vec4(displayTexCoord.x, displayTexCoord.y, 1, 1);
    else if (renderType == 8) // uv test pattern
	{
        FragColor = vec4(texture(UVTestPattern, displayTexCoord).rgb, 1);
	}
    else if (renderType == 9) //Display tangents
        FragColor = vec4(displayTangent,1);
    else if (renderType == 10) //Display bitangents
        FragColor = vec4(displayBitangent,1);
    else if (renderType == 11) //Display lights from second bake map if exists
	{
	   //     FragColor =  vec4(texture(BakeLightMap, f_texcoord2).rgb, 1);

    
		vec4 AmbientOcc = vec4(texture(BakeShadowMap, f_texcoord1).rrr, 1);
		vec4 ColorMain = vec4(((33,33,33 * alpha * outputColor)).xyz, 1.0);

		vec3 LightHDRScale = vec3(1);

		vec3 LColor = vec3(1); 

		if (LightMapColor.a > 0.9)
		{
		    LColor = vec3(1); 
		}
		else
		{
		    LColor = LightMapColor.rgb;
		}

	    if (HasLightMap == 1)
		{
		    vec3 LightMap = LightHDRScale * LColor * LightMapColor.a;

		    FragColor = AmbientOcc * ColorMain * vec4(LightMap, 1) ;

		}

        if (HasEmissionMap == 1)
	    {
	        vec3 emission = texture2D(EmissionMap, displayTexCoord).rgb * vec3(1);
	        FragColor.rgb += emission.rgb;
	    }
	}


    // Toggles rendering of individual color channels for all render modes.
    FragColor.rgb *= vec3(renderR, renderG, renderB);
    if (renderR == 1 && renderG == 0 && renderB == 0)
        FragColor.rgb = FragColor.rrr;
    else if (renderG == 1 && renderR == 0 && renderB == 0)
        FragColor.rgb = FragColor.ggg;
    else if (renderB == 1 && renderR == 0 && renderG == 0)
        FragColor.rgb = FragColor.bbb;

    if (renderAlpha != 1 || isTransparent != 1)
        FragColor.a = 1;

    if (renderType == 12)
        FragColor.rgb = boneWeightsColored;
}